[//]: # (zauthor: Sean Soper)
[//]: # (ztitle: Making an Authorized Request to the E*TRADE API with OkHttp)
[//]: # (zsubtitle: Create an OAuth v1 request using a custom interceptor)
[//]: # (zimage: https://unsplash.com/photos/gaAopnw13EA)
[//]: # (ztags: kotlin, batil, etrade, api, okhttp)

While the default Java [HttpClient](https://docs.oracle.com/en/java/javase/11/docs/api/java.net.http/java/net/http/HttpClient.html) is just fine for simple requests, we will be interacting with an OAuth v1 powered endpoint which will require requests to be signed. Frankly, I don’t want to have to worry about all those details and for that the [OkHttp](https://square.github.io/okhttp/) library fits our needs perfectly.

> This post builds on work previously done in [Reading a YAML Configuration File in Kotlin](/blog/reading_yaml_configuration_file_kotlin.html).

## OkHttp

First we are going to bring in [OkHttp](https://square.github.io/okhttp/) which we will use as a base on which to build our HTTP client. 

    # build.gradle.kts
    
    dependencies {
      …
      implementation("com.squareup.okhttp3:okhttp:4.9.0")
    }     

OkHttp implements the [Builder pattern](https://en.wikipedia.org/wiki/Builder_pattern) which is straight out of GoF’s [Design Patterns](https://en.wikipedia.org/wiki/Design_Patterns). We can verify the new dependency works with a simple example.

    val client = OkHttpClient.Builder().build()
            
    val request = Request.Builder()
            .url("https://www.google.com")
            .build()
            
    val response = client.newCall(request).execute()
    
    response.body?.let { 
        println(it.string())
    }

## Intercept

One of the _many_ great things about the OkHttp library is its extensibility particularly the ease with which we can add an [interceptor](https://square.github.io/okhttp/interceptors/). In our case, we will need an Oauth v1 interceptor which can sign our requests with the E\*TRADE supplied keys we received. Fortunately, most of the hard work has been done for us. This [interceptor](https://gist.github.com/ssoper/30b92aad67a36facbc8974aab8ee865f), which I updated to work with E\*TRADE endpoints, was forked off the [Kotlin version](https://gist.github.com/polson/227e1a039a09f2728163bf7235990178) of an [OAuth v1 interceptor](https://gist.github.com/JakeWharton/f26f19732f0c5907e1ab) originally written by [Jake Wharton](https://twitter.com/JakeWharton).

But rather than just dump all our code in the root of our project, we are going to create a _package_. I have an eye towards supporting more than one broker in the future so I’d like to organize and componentize it for ease of maintenance.

<img src="/images/blog/make_authorized_request_etrade_api_okhttp/package.png" alt="Package Screenshot" class="img-fluid rounded embedded">

We are going to name our package `connectors` and when you add a new file/class within this package you will notice that the `package` identifier at the top of the file will be automatically set to the correct value. Any files in your project that make use of a class in the package will need to reference the full package name. Let’s go ahead and add  [Etrade.kt](https://github.com/ssoper/Batil/compare/3621d1..4ce8af7d#diff-55026f9c4d29af5bb2da0dc3a2443162d9edbdcc133fa352c9ba47f1c62fc0c2) and [EtradeInterceptor.kt](https://github.com/ssoper/Batil/compare/3621d1..4ce8af7d#diff-45fa7f853a7eb393636dff3376814cdeedf1323472b7aaf251b40818b4448da7) to our new package.

With the `Interceptor` doing the heavy lifting of signing our requests, we can focus on crafting the correct URL request to get our OAuth tokens. While additional work would be required to parse the URL-encoded response, here is what the base functionality would look like.

    val keys = OauthKeys(
        consumerKey = consumerKey,
        consumerSecret = consumerSecret
    )
    
    val client = OkHttpClient.Builder()
        .addInterceptor(EtradeInterceptor(keys))
        .build()
        
    val request = Request.Builder()
        .url("https://apisb.etrade.com/oauth/request_token")
        .build()
        
    val response = client.newCall(request).execute()

## Tokens

With our consumer keys stored in our [YAML file](/blog/reading_yaml_configuration_file_kotlin.html) for easy retreival, we can pass them along to our HTTP client and get back the OAuth tokens required for the next step in our journey.

    val client = Etrade(configuration, parsed.production)
    
    client.requestToken().apply {
        println("Token: $accessToken, secret: $accessSecret")
    }

A summary of these commits can be found [here](https://github.com/ssoper/Batil/compare/3621d1..4ce8af7d).
