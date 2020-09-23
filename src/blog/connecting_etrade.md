[//]: # (zauthor: Sean Soper)
[//]: # (ztitle: Connecting to the E*TRADE API)
[//]: # (zsubtitle: How to interact with E*TRADE’s API via Postman)
[//]: # (zimage: https://unsplash.com/photos/8Gg2Ne_uTcM)
[//]: # (ztags: postman, api, stocks)

While there are a number of [fantastic APIs available](https://iexcloud.io/core-data-catalog/) for those looking to build stock market related apps, most cost money for anything beyond the basics. But if you have an existing E\*TRADE account and a bit of patience you can get realtime data, including options chains, from one of the top brokers in the market.

When you first come across the [API documentation](https://developer.etrade.com/home) describing how to access it, you might assume you are dealing with OAuth v2. In fact you are not as E*TRADE is still using the outdated OAuth v1 implementation along with some non-standard parameters that [until recently](https://github.com/postmanlabs/postman-app-support/issues/283) weren’t even available for users of Postman, my preferred tool for manually connecting to APIs.

## Sandbox Credentials

The first thing you’ll need to do is request a Sandbox API consumer key and secret from the API team. Sign into your E\*TRADE account and head over to `Customer Service` ➡ `Message Center` ➡ `Contact Us`. From there select the account you want to associate your API key with. For subject select `API Sandbox Auto` and for topic `Sandbox Key`. You’re welcome to write something in the message section but the response is automatic and most likely not even read by a human. You should hear back within a few hours.

## Postman

Now that you’ve got your Sandbox credentials let’s start with downloading the latest version of [Postman](https://www.postman.com/), at least v7.27 or higher. Open the app and create three tabs. The first tab will be for requesting the token, the next for accessing the token and finally we will make an actual secure request to get information about a ticker. There will also be a small detour to the browser to validate our token.

## Request Token

Set the request to GET with the url `https://apisb.etrade.com/oauth/request_token`. Under Authorization, set the Type to `OAuth 1.0`. Fill in the fields for `Consumer Key` and `Consumer Secret` using the keys sent to you by E\*TRADE. Finally, set the value of `Callback URL` to `oob`. The remaining default values should be fine. Upon hitting send you will get URL encoded values back that look like:

    oauth_token=URL_ENCODED_TOKEN&oauth_token_secret=URL_ENCODED_SECRET&oauth_callback_confirmed=true

<img src="/images/blog/connecting_etrade/request_token.png" alt="Request Token Screenshot" class="img-fluid rounded embedded">

## Token Authorization

Ok here’s the tricky part. Even though we are technically using Sandbox credentials we need to switch to using a production endpoint to grant our “application” access to the API. Using the value of the `Consumer Key` and the token (`oauth_token`) you just received from the API call, paste the following URL into a browser.

    https://us.etrade.com/e/t/etws/authorize?key=KEY&token=TOKEN

Note that the value of `oauth_token` is only good for five minutes so be quick. As well, if you see an error about logging in you may want to try logging out of all E\*TRADE sessions and reload in an incognito tab. If it works you should see a T&C page asking you to accept and once that happens you’ll get a six-digit code you’ll want to copy and store. This will be the value of `Verifier`.

<img src="/images/blog/connecting_etrade/browser.jpg" alt="Browser Screenshot" class="img-fluid rounded embedded">

## Access Token

Return to Postman and duplicate the first request we made. Change the URL to `https://apisb.etrade.com/oauth/access_token`. We’ll also want to update the following values:

* Access Token: The returned value of `oauth_token` from the previous request. Ensure the value is URI decoded.
* Token Secret: The returned value of `oauth_token_secret` from the previous request. Ensure the value is URI decoded.
* Callback URL: `oob`, I’ve no idea why but E\*TRADE says it’s required.
* Verifer: The six-digit code from the browser session.

After hitting Send on this request you will get yet _another_ set of values for `oauth_token` and `oauth_token_secret` which we will now use in all requests going forward.

<img src="/images/blog/connecting_etrade/access_token.png" alt="Access Token Screenshot" class="img-fluid rounded embedded">

## Ticker Data

We should now be able to make validated requests to the E\*TRADE Sandbox API. Duplicate the second tab and change the URL to `https://apisb.etrade.com/v1/market/quote/GOOG`. Update the following values:

* Access Token: The returned value of `oauth_token` from the previous request. Ensure the value is URI decoded.
* Token Secret: The returned value of `oauth_token_secret` from the previous request. Ensure the value is URI decoded.

The remaining values, including `Verifier`, should remain unchanged. Hit Send and you should now get back sandbox data for the GOOG ticker.

## Production

To access the production API you’ll need to send a _signed_ copy of the [Developer Agreement](https://content.etrade.com/etrade/estation/pdf/APIDeveloperAgreement.pdf) to `etradeapi@etrade.com`. Rather than print it out and scan it back in I used [Smallpdf](https://smallpdf.com/) to edit and download it. Once you get access to live data it should be as simple as [swapping out](https://stackoverflow.com/a/62439835) the `apisb.etrade.com` with `api.etrade.com`.
