[//]: # (zauthor: Sean Soper)
[//]: # (ztitle: Automating the Retrieval of a Verifier Code from E*TRADE)
[//]: # (zsubtitle: Utilizing the Chrome DevTools Protocol in your Kotlin app)
[//]: # (zimage: https://unsplash.com/photos/1uY0RHPDogE)
[//]: # (ztags: kotlin, batil, etrade, api, okhttp, chromium, reactive)

Automating browser actions is nothing new and as a developer I saw an opportunity to remove a manual step when I realized that the E\*TRADE supplied [Java client](https://developer.etrade.com/home) simply opens up a web browser. Having worked with [Selenium](https://www.selenium.dev/) and [Phantom.js](https://phantomjs.org/) in the past, I found the Chrome DevTools Protocol to be a bit more challenging though that may have had more to do with the Reactive interface.

> This post builds on work previously done in [Making an Authorized Request to the E*TRADE API with OkHttp](/blog/make_authorized_request_etrade_api_okhttp.html).

## jsoup

My first attempt at automatically retrieving a Verifier code was with [jsoup](https://jsoup.org/). As an HTML parser, jsoup is one of the more popular options in the Java world. It provides CSS3-like selector for parsing and manipulating the DOM just like you would find in any major browser. Yet my attempts at filling in the form and clicking submit kept leading me back to the E\*TRADE login page instead of the next step of verification. Clearly there was something an actual browser was doing that I was not. Simple DOM manipulation was not going to cut it. Given that a browser does so much more like store cookies and listen for DOM events, it was obvious that jsoup was not going to cut it.

## Chrome

Realizing I needed something a bit beefier to get that Verifier code, I turned to searching for headless browsers that worked with Kotlin and stumbled upon [wendigo’s](https://twitter.com/wendigo) [chrome-reactive-plugin](https://github.com/wendigo/chrome-reactive-kotlin). An interface to the [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) using [RxJava](https://github.com/ReactiveX/RxJava), this seemed to be precisely what I needed. 



testing has been a thing for at least a decade  While the topic of this article doesn’t deal with anything novel,  might come off as little more than Selenium for Kotlin,  The retrieval of the `Verifier Code` remains the last manual step in the process of automating our connection to the E*TRADE API. But making use of 3rd party tools such as Docker and Chromium can get us over that last hump, opening the way to a fully automated algotrader.

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

But rather than just dump all our code in the root of our project, we are going to create a _package_. With an eye towards supporting more than one broker in the future it makes sense to organize and componentize it for ease of maintenance.

<img src="/images/blog/make_authorized_request_etrade_api_okhttp/package.png" alt="Package Screenshot" class="img-fluid rounded embedded">

We are going to name our package `connectors` and when you add a new file/class within this package you will notice that the `package` identifier at the top of the file will be automatically set to the correct value. Any files in your project that make use of a class in the package will need to reference the full package name. Let’s go ahead and add  [Etrade.kt](https://github.com/ssoper/Batil/compare/3621d1..4ce8af7d#diff-55026f9c4d29af5bb2da0dc3a2443162d9edbdcc133fa352c9ba47f1c62fc0c2) and [EtradeInterceptor.kt](https://github.com/ssoper/Batil/compare/3621d1..4ce8af7d#diff-45fa7f853a7eb393636dff3376814cdeedf1323472b7aaf251b40818b4448da7) to our new package.

With the `Interceptor` doing the heavy lifting of signing our requests, we can focus on crafting the correct URL request to get our OAuth tokens. While additional work would be required to [parse](https://github.com/ssoper/Batil/compare/3621d1..4ce8af7d#diff-55026f9c4d29af5bb2da0dc3a2443162d9edbdcc133fa352c9ba47f1c62fc0c2R71) the URL-encoded response, here is what the base functionality would look like.

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

With our consumer keys stored in our [YAML file](/blog/reading_yaml_configuration_file_kotlin.html) for easy retrieval, we can pass them along to our HTTP client and get back the OAuth tokens required for the next step in our journey.

    val client = Etrade(configuration, parsed.production)
    
    client.requestToken().apply {
        println("Token: $accessToken, secret: $accessSecret")
    }

A summary of these commits can be found [here](https://github.com/ssoper/Batil/compare/3621d1..4ce8af7d).
