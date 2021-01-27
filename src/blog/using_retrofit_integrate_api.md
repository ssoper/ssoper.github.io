[//]: # (zauthor: Sean Soper)
[//]: # (ztitle: Using Retrofit to Integrate with an API)
[//]: # (zsubtitle: Building out a full-featured client complete with tests)
[//]: # (zimage: https://unsplash.com/photos/EYKW9T91_zw)
[//]: # (ztags: kotlin, batil, etrade, api, okhttp, retrofit, testing, jackson)

Integrating against an API involves a fair amount of work, especially if you want to do more than the bare minimum like including tests. Thanks to tools like [Retrofit](https://medium.com/tompee/creating-your-own-http-api-wrapper-library-retrofit-2-bc86dfc11b1c), [OkHttp](https://medium.com/swlh/okhttp-interceptors-with-retrofit-2dcc322cc3f3) and their suite of plugins, this task becomes much more manageable.

> This post builds on work previously done in [Automating the Retrieval of a Verifier Code from E*TRADE](/blog/automating_retrieval_verifier_code_etrade.html).

## Retrofit

Per the previous work we’ve done on building this E\*TRADE client, OkHttp should already be included in the codebase. However, OkHttp acts to simply send or retrieve data over a network, it doesn’t try to transform it. That is where Retrofit comes in which plays nicely with OkHttp and offers a multitude of serializers. E\*TRADE offers both XML and JSON format as does Retrofit but JSON is fairly standard so we will go with that using the well-known [Jackson serializer](https://github.com/FasterXML/jackson). We’ll add these dependencies to our `build.gradle.kts`.

    implementation("com.squareup.okhttp3:logging-interceptor:4.9.0")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-jackson:2.9.0")

To ensure every request has the appropriate header set so that JSON is returned, we will add a custom interceptor.

    class JsonInterceptor: Interceptor {
        @Throws(IOException::class)
        override fun intercept(chain: Interceptor.Chain): Response {
            val original = chain.request()
            val request = original.newBuilder()
                .header("Accept", "application/json")
                .build()
                
            return chain.proceed(request)
        }
    } 

This interceptor will need to be referenced in the OkHttp client that we will be using. Note that both OkHttp and Retrofit make use of the [Builder pattern](https://www.baeldung.com/kotlin/builder-pattern) which is common across Java and Kotlin libraries.

    val client = OkHttpClient.Builder()
        .addInterceptor(EtradeInterceptor(keys))	            
        .addInterceptor(JsonInterceptor())

It’s also a good idea to add some logging and maybe put it behind a flag if only to help in debugging.

    if (verbose) {
        val logger = HttpLoggingInterceptor()
        logger.level = HttpLoggingInterceptor.Level.BODY
        client.addInterceptor(logger)
    }

The remaining work necessary to build the Retrofit client instance is somewhat dependent on the serialization library you’re using, such as Gson vs. Jackson, and expected date formats. This assumes Jackson is your serializer, that dates come back in an [ISO-8601 format](https://en.wikipedia.org/wiki/ISO_8601) aka `HH:mm:ss zzz dd-MM-yyyy` and that you’re using a Gregorian calendar.

    val module = SimpleModule()
    module.addDeserializer(GregorianCalendar::class.java, DateSerializer.Decode())
    
    val mapper = ObjectMapper()
    mapper.dateFormat = SimpleDateFormat("HH:mm:ss zzz dd-MM-yyyy")
    mapper.registerModule(module)
    mapper.registerModule(KotlinModule())
    
    val retrofit = Retrofit.Builder()
        .client(client.build())
        .baseUrl(baseUrl)
        .addConverterFactory(JacksonConverterFactory.create(mapper))
        .build()
    
    val service = retrofit.create(Market::class.java)
    val response = service.getQuote(symbol).execute()
    
    return response.body()?.response?.data

## To Market, To Market

The JSON returned from the call to the E\*TRADE `market` endpoint looks like this (with a bunch of other data removed).

    {
      "QuoteResponse": {
        "QuoteData": [
          {
            "dateTime": "11:41:00 EST 12-24-2020",
            "dateTimeUTC": 1608828060,
            "quoteStatus": "REALTIME",
            "All": {
              "ask": 132.31,
              "askSize": 600,
              "askTime": "11:41:00 EST 12-24-2020",
              "bid": 132.29,
              "companyName": "APPLE INC COM",
            }
          }
        ]
      }
    }

Starting with the outer structure we can create our model in Retrofit one layer at a time. This is our entrypoint.

    interface Market {
        @GET("v1/market/quote/{symbol}")
        fun getQuote(@Path("symbol") symbol: String): Call<TickerDataResponse>
    }

We can then add the three `data class` classes required to access the `All` key of the JSON response. Note that instead of using the default `All`, we can tell Retrofit to replace that key name with `tickerData` which sounds more logical. As well, `QuoteData` is actually an array so we will use a `List` type.

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class QuoteData(
        val dateTime: GregorianCalendar,
        val quoteStatus: QuoteStatus,
        
        @JsonProperty("All")
        val tickerData: TickerData
    )
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    data class QuoteResponse(
        @JsonProperty("QuoteData")
        val data: List<QuoteData>
    )
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    data class TickerDataResponse(
        @JsonProperty("QuoteResponse")
        val response: QuoteResponse
    )

## Serializing Dates

Date serialization can be a tricky thing even when the library purports to support it. The documentation indicated that this could all be accomplished with annotations but that proved problematic. Since the returned dates all follow the same format, it makes sense to define it in just one place. This `DateSerializer` class was referenced when we created the Retrofit client.

    object DateSerializer {
        private const val Format = "HH:mm:ss zzz dd-MM-yyyy"
        val Formatter = SimpleDateFormat(Format)
        
        class Encode: JsonSerializer<GregorianCalendar>() {
            @Throws(IOException::class, JsonProcessingException::class)
            override fun serialize(value: GregorianCalendar?, gen: JsonGenerator?, serializers: SerializerProvider?) {
                value?.apply {
                    gen?.writeString(Formatter.format(time))
                }
            }
        }
        
        class Decode: JsonDeserializer<GregorianCalendar>() {
            @Throws(IOException::class, JsonProcessingException::class)
            override fun deserialize(p: JsonParser?, ctxt: DeserializationContext?): GregorianCalendar {
                return p?.text?.let {
                    val date = Formatter.parse(it)
                    val calendar = GregorianCalendar()
                    calendar.time = date
                    
                    calendar
                } ?: throw DeserializerException()
            }
        }
        
        class DeserializerException: JsonProcessingException("Could not parse JSON")
    }

## Enums

The other really cool thing about Retrofit is that we can transform an item from a predefined set of values into a native enum value. We will use this to represent `QuoteStatus`.

    enum class QuoteStatus {
        REALTIME, DELAYED, CLOSING, EH_REALTIME, EH_BEFORE_OPEN, EH_CLOSED, UNKNOWN
    }

## Ticker Data

Now that we’ve unwrapped the response down to the final layer, it’s time to define the model for the actual ticker data being returned.

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class TickerData(
        val adjustedFlag: Boolean?,           // Indicates whether an option has been adjusted due to a corporate action (for example, a dividend or stock split)
        val annualDividend: Float?,           // Cash amount paid per share over the past year
        val ask: Float?,                      // The current ask price for a security
        val askExchange: String?,             // Code for the exchange reporting the ask price
        …
        val timeOfLastTrade: Int?,            // The time when the last trade was placed
        val averageVolume: Int?,              // Average volume value corresponding to the symbol
    )

Ok so I actually cut out about 100 lines of code in that snippet but you can see the full model definition [here](https://github.com/ssoper/Batil/pull/3/files#diff-e21a5eb98bd28187abe308dfe9b97cbc1f8e864b176ed3edcf5c9611f650ee19R59). With that done however, we can now fully represent the E\*TRADE response using Retrofit and start writing tests against it.

## Umm, Tests?

So it’s kind of amazing we’ve written this much code without once mentioning tests. At this point it seemed necessary though as the last thing you want to do is constantly hit an API when building out your model. Better to have a static response hosted locally that you can more quickly and easily validate changes against. Let’s add the following to our `build.gradle.kts`.

    testImplementation("io.kotlintest:kotlintest-runner-junit5:3.4.2")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.9.0")

This will need to be added to the root.

    tasks.withType<Test> {
        useJUnitPlatform()
    }

With OkHttp’s `MockWebServer` we can serve up JSON responses to validate unit tests. Let’s take the JSON response from one of these calls and save it in a file called `single_ticker_success.json` somewhere under `test/resources`. To make loading of these JSON responses easy, I’ve added a convenience class `MockResponseFile`.

    class MockResponseFile(path: String) {
        val content: String
        
        init {
            val reader = InputStreamReader(this.javaClass.classLoader.getResourceAsStream(path)!!)
            content = reader.readText()
            reader.close()
        }
    }

We’ll want to create our actual test in a file called `EtradeTest.kt` under `test/kotlin`.

    class EtradeTest: StringSpec({
        val config = LoadConfig().content
        
        "single ticker" {
            val server = MockWebServer()
            server.start()
            
            val content = MockResponseFile("single_ticker_success.json").content
            content.shouldNotBeNull()
            
            val response = MockResponse()
                .addHeader("Content-Type", "application/json")
                .setBody(content)
            server.enqueue(response)
            
            val client = Etrade(config, baseUrl = it.url(".").toString())
            val oauth = EtradeAuthResponse("token", "secret")
            val data = client.ticker("AAPL", oauth, "verifierCode")
            
            data.shouldNotBeNull()
            data.tickerData.shouldNotBeNull()
            data.tickerData.symbolDescription.shouldBe("APPLE INC COM")
            server.takeRequest().path.shouldBe("/v1/market/quote/AAPL")            
            
            server.close()
        }
    })

This test uses OkHttp to setup a temporary server instance on your local machine which will _only_ return the JSON specified when accessed. Once the data has been returned it can be checked, the request path verified and finally the server shut down.

## Converting API Documentation to Kotlin

The E\*TRADE API is a fairly large API with lots of hierarchy. Going through it line by line on a website and replicating it in Kotlin seemed like a pretty tall order so I created a small script to make it easier. I thought it would take no more than an hour but many hours later, after fruitlessly searching for my compiler textbooks from college, I came up with something that did the trick and didn’t require [lex, yacc or bison](http://dinosaur.compilertools.net/). Instead it uses `sed`, `sort` and a handful of other tools provided by bash. You can find the full implementation [here](https://github.com/ssoper/Batil/pull/3/files#diff-790671999cfa750dfd2233f1d4a750ffbee0e973e27be32e78d25bc9cf598fbdR1). Perhaps you can find it useful in other contexts.

## Summary

Retrofit, OkHttp and their suite of plugins make API integration much easier. Having tests reduces the chances of introducing bugs when changing your implementation. They also add a sanity check in case the API changes underneath you.

A summary of these commits can be found [here](https://github.com/ssoper/Batil/pull/3/files).

