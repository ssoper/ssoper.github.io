[//]: # (zauthor: Sean Soper)
[//]: # (ztitle: Automating the Retrieval of a Verifier Code from E*TRADE)
[//]: # (zsubtitle: Navigating the web in Kotlin using Chrome)
[//]: # (zimage: https://unsplash.com/photos/1uY0RHPDogE)
[//]: # (ztags: kotlin, batil, etrade, api, okhttp, chromium, reactive)

Automating browser actions is nothing new and as a developer I saw an opportunity to remove a manual step when I realized that the E\*TRADE supplied [Java client](https://developer.etrade.com/home) simply opens up a web browser. Having worked with [Selenium](https://www.selenium.dev/) and [Phantom.js](https://phantomjs.org/) in the past, I found the Chrome DevTools Protocol to be a bit more challenging though that may have had more to do with the Reactive interface.

> This post builds on work previously done in [Making an Authorized Request to the E*TRADE API with OkHttp](/blog/make_authorized_request_etrade_api_okhttp.html).

## First Attempt

My first attempt at automatically retrieving a `Verifier` code was with [jsoup](https://jsoup.org/). As an HTML parser, jsoup is one of the more popular options in the Java world. It provides CSS3-like selector behavior for parsing and manipulating the DOM just like you would find in any major browser. Yet my attempts at filling in the form and clicking submit kept leading me back to the E\*TRADE login page instead of the next step of verification. Clearly there was something an actual browser was doing that jsoup was not. Given that a browser does so much like store cookies and listen for DOM events, it was obvious that simple DOM manipulation was not going to cut it.

## Chrome

Realizing I needed something a bit beefier to get that `Verifier` code, I started searching for headless browsers that worked with Kotlin and stumbled upon [wendigo’s](https://twitter.com/wendigo) [chrome-reactive-plugin](https://github.com/wendigo/chrome-reactive-kotlin). An interface to the [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) using [RxJava](https://github.com/ReactiveX/RxJava), this seemed to be precisely what I needed. 

First thing we’ll want to do is download [Docker](https://www.docker.com/). Once that is setup we will have to create a locally running container using a Chromium image. We should also provide an additional [argument](https://peter.sh/experiments/chromium-command-line-switches/) to pass in a custom value for `user-agent`. Without the custom `user-agent` argument, Chromium will opt for a default value that acts like a giant blinking neon sign for browser sniffers trying to detected automated interactions.

    docker container run -d -p 9222:9222 zenika/alpine-chrome --no-sandbox --remote-debugging-address=0.0.0.0 --remote-debugging-port=9222 --user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36" about:blank

You’ll also need to add the `chrome-reactive-plugin` to your dependencies in `build.gradle.kts`.

    implementation("pl.wendigo:chrome-reactive-kotlin:0.6+")

To verify that we can connect to our Docker instance let’s implement the “Hello, world” version of RxJava + Chromium.

    import pl.wendigo.chrome.api.page.NavigateRequest
    
    val chrome = Browser.builder()
                  .withAddress("127.0.0.1:9222")
                  .build()
    
    chrome.use { browser ->
        browser.target("about:blank").use { target ->
            await {
                target.Page.enable()
            }
            
            await {
                target.Page.navigate(NavigateRequest(url = "https://etrade.com")).flatMap { (frameId) ->
                    target.Page.frameStoppedLoading().filter {
                        it.frameId == frameId
                        println("Loaded E*TRADE homepage")
                    }.take(1).singleOrError()
                }
            }
        }
    }

Provided everything is running correctly you should see a `Loaded E*TRADE homepage` on your console along with a bunch of log messages coming from the library.

## Reactive

I’d like to put some caveats out there about this implementation. First, this is using RxJava, not Kotlin Flows which is my personal preference for making use of Reactive patterns. Second, this should be considered a _naive implementation_ in that it makes use of blocking code due to limitations in the Chome DevTools Protocol and what is returned in callbacks. Reactive patterns work best when callbacks contain all the information required to open and close streams. In my time spent researching this, I found it nigh impossible to get even the URL of the currently loaded web page. So while the blocking code isn’t ideal, it should at least help with readability.

## Basic Plan

Let’s [review the steps](/blog/connecting_etrade.html) required to obtain a `Verifier` code manually and write it down in pseudo-code.

1. Browse to `https://us.etrade.com/e/t/etws/authorize?key=value&token=value` substituting with the correct values.
2. Follow redirects to login page.
3. Login with your username and password and click submit.
4. Follow redirects to Accept ToS page.
5. Click submit on Accept ToS page.
6. Follow redirects to Display Verifier code page.
7. Get value for `Verifier` code.

Using these steps, we can consolidate into the following common set of functions.

* Navigation
* Clicking elements
* Filling in values
* Retrieving values

Additionally we will probably want some means of taking a screenshot and saving it to disk for debugging.

## Navigation

This is pretty much a clone of the “Hello, world” above. It navigates to a URL using the specified URL, filters on the resulting navigation ended events and pulls out the one that matches our `frameId`. It then returns a [Single](http://reactivex.io/documentation/single.html) which is like an [Observable](http://reactivex.io/documentation/observable.html) except that it is either a value or an error, ideal for our naive implementation.

    private fun navigateTo(url: String, target: Target): Single<FrameStoppedLoadingEvent> {
        return target.Page.navigate(NavigateRequest(url = url)).flatMap { (frameId) ->
            target.Page.frameStoppedLoading().filter {
                it.frameId == frameId
            }.take(1).singleOrError()
        }
    }

Note the `Target` argument which comes from the `Browser` context and is passed into every function that we will be building.

## DOM Manipulation

When passing in a DOM tree to manipulate, we first need to get the root element. Because we are navigating a flow, that root value changes with every new page we load.

    private fun getRootNode(target: Target): Single<Node> {
        return target.DOM.getDocument(GetDocumentRequest(-1)).flatMap { (node) ->
            Single.just(node)
        }
    }

With our root node, filling in a form field is just a matter of changing the value of the specified DOM element.

    private fun fillValue(rootNode: Node, selector: String, value: String, target: Target): Single<ResponseFrame> {
        return target.DOM.querySelector(QuerySelectorRequest(rootNode.nodeId, selector)).flatMap { (fieldUsername) ->
            target.DOM.setAttributeValue(SetAttributeValueRequest(fieldUsername, "value", value)).flatMap {
                Single.just(it)
            }
        }
    }

Retrieving a value out of the DOM is simple as well.

    private fun getValue(rootNode: Node, selector: String, target: Target): Single<String> {
        return target.DOM.querySelector(QuerySelectorRequest(rootNode.nodeId, selector)).flatMap { (element) ->
            target.DOM.getAttributes(GetAttributesRequest(element)).flatMap { (attributes) ->
                attributes.indexOf("value").let {
                    val found = attributes[it+1].trim()
                    Single.just(found)
                }
            }
        }
    }

With these two functions in place we can now fill in forms with the following code.

    await { fillValue(authNode, "input[name='USER']", username, target) }
    await { fillValue(authNode, "input[name='PASSWORD']", password, target) }

And retrieve values just as easily.

    await { getValue(verifierNode, "div > input[type='text']", target) }

Those `await` wrapping calls are required since we are using a blocking implementation. They won’t return until the `Single` is returned from the called functions.

## Clicking Like a Human Would

My first thought around writing a function to submit forms was to simply fire the submit event on the form. But that sounds like something a bot would do 🤖. For even the dumbest of browser sniffers, that should be an easy thing to pick out. So I opted for something more human-like. We will find the clickable element in the DOM, press it using our “mouse” and then release, just like a human would.

    private fun clickElement(rootNode: Node, selector: String, target: Target): Single<ResponseFrame> {
        return target.DOM.querySelector(QuerySelectorRequest(rootNode.nodeId, selector)).flatMap { (button) ->
            target.DOM.getBoxModel(GetBoxModelRequest(button)).flatMap { (box) ->
                val coordinates = Pair(box.content[0]+1, box.content[1]+1)
    
                target.Input.dispatchMouseEvent(
                        DispatchMouseEventRequest("mousePressed",
                                coordinates.first,
                                coordinates.second,
                                button = MouseButton.LEFT,
                                clickCount = 1)).flatMap {
                    target.Input.dispatchMouseEvent(DispatchMouseEventRequest("mouseReleased",
                            coordinates.first,
                            coordinates.second,
                            button = MouseButton.LEFT))
                }
            }
        }
    }

Note that we are doing a little geometry math here as we are getting the `(x,y)` coordinates of the DOM element and then passing in those values to our mouse press and release events. This simulates an actual mouse click vs. simply firing off an event that can be intercepted and sniffed.

## Screenshots

Throughout this process I found it difficult to visualize what was going on in the Dockerized Chromium instance. So, I built myself a screenshot function that would create a new directory in `/tmp` for every run of the app. This proved invaluable as I was able to discern when my attempts were being [sniffed out](https://stackoverflow.com/questions/57752683/problem-logging-onto-e-trade-on-selenium-and-chrome-driver) or were simply failing.

    private enum class Screenshot {
        AUTHORIZATION,
        ACCEPT_TOS,
        VERIFIER_CODE
    }
    
    private val tmpDirPath: Path by lazy {
        val charPool : List<Char> = ('a'..'z') + ('A'..'Z') + ('0'..'9')
        val randomString = (1..15)
                .map { kotlin.random.Random.nextInt(0, charPool.size) }
                .map(charPool::get)
                .joinToString("")
    
        Paths.get("/tmp", "screenshots", randomString)
    }
        
    private fun saveScreenshot(screenshot: Screenshot, target: Target): Single<Path> {
        return target.Page.captureScreenshot(CaptureScreenshotRequest()).flatMap { (data) ->
            val byteArray = Base64.getDecoder().decode(data)
            val filename = "${screenshot.ordinal}_${screenshot.name}.png"
            val path = Paths.get(tmpDirPath.toString(), filename)
            path.toFile().writeBytes(byteArray)
            Single.just(path)
        }
    }

The use of the `enum` makes it easy to create descriptive file names that are also sorted by step like `1_AUTHORIZATION.png`.

## Implementation

With our functions defined, we can then use the following flow to return the value of `Verifier` code.


    import pl.wendigo.chrome.api.page.NavigateRequest
    
    private val url = "https://us.etrade.com/e/t/etws/authorize?key=$key&token=$token"
    private val delay = (5*1000).toLong() // 5 seconds should account for most delays
    private val chrome = Browser.builder()
                          .withAddress("127.0.0.1:9222")
                          .build()
    
    return chrome.use { browser ->
        browser.target("about:blank").use { target ->
            await { target.Page.enable() }
            await { navigateTo(url, target) }
            val authNode = await { getRootNode(target) }
    
            await { fillValue(authNode, "input[name='USER']", username, target) }
            await { fillValue(authNode, "input[name='PASSWORD']", password, target) }
            await { saveScreenshot(Screenshot.AUTHORIZATION, target) }
    
            await { clickElement(authNode, "#logon_button", target) }
            Thread.sleep(delay)
            await { saveScreenshot(Screenshot.ACCEPT_TOS, target) }
    
            val tosNode = await { getRootNode(target) }
            await { clickElement(tosNode, "input[value='Accept']", target) }
            Thread.sleep(delay)
            await { saveScreenshot(Screenshot.VERIFIER_CODE, target) }
    
            val verifierNode = await { getRootNode(target) }
            await { getValue(verifierNode, "div > input[type='text']", target) }
        }
    }

## Summary

After an initial false start with jsoup we finally found some traction with Chrome DevTools. I don’t mean to knock jsoup as it’s a fantastic library on its own if you’re just looking to interact with a single web page. However, for the more complex interactions we found that the Chrome DevTools Protocol was the best solution.

A summary of these commits can be found [here](https://github.com/ssoper/Batil/compare/4ce8af7..6fa02e2).
