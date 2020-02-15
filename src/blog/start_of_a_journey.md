[//]: # (zauthor: Sean Soper)
[//]: # (ztitle: Start of a Journey)
[//]: # (zsubtitle: Rediscovering what made me fall in love with programming originally)
[//]: # (zimage: https://unsplash.com/photos/8dXad1em74g)
[//]: # (ztags: programming, kotlin)

It all started at KotlinConf 2019 in Copenhagen. Technically I’d already been using Kotlin for nearly two years by that point having run teams that developed Android apps built with a mix of Java and Kotlin. But I’d left a good portion of the implementation up to the developers themselves, only going into the code to fiddle with Gradle build settings or giving pull requests a once over.

With a decade of Objective-C under my belt and a half decade of Swift, it definitely wasn’t a typical conference for me. But as a developer you’ve always got to stay current, if not ahead, of trends if you want to be successful in this industry. Besides, I’d been hearing for _years_ that Swift and Kotlin had something of a shared heritage, or at least similar syntax, and I was curious to find out more.

## KotlinConf

The conference itself was amazing with a fantastic opening keynote that made clear the goals of the language. Let me just add that they are _audacious_ goals. All the talks I attended were great and I wish I’d brought a clone with me to attend the rest. The theme of KotlinConf seemed to be “Kotlin everywhere” i.e. Kotlin/Native, [Kotlin Multiplatform](https://kotlinlang.org/docs/reference/building-mpp-with-gradle.html), etc. They, as in Jetbrains, don’t want Kotlin to be just a first-class language for Android development but a first-class language for web and iOS development too, the latter by generating business logic via their Objective-C runtime.

## Learning Kotlin

Not wanting to sound like a total n00b I took an online [Udacity course](https://www.udacity.com/course/kotlin-bootcamp-for-programmers--ud9011) the weekend before the conference. After returning from Copenhagen, I decided that I wanted to do more than just poke around. I wanted to _build_ something that others could potentially use. For the past few years I’ve been tossing around the idea of finally upgrading my website to something a bit more dynamic. But I’m cheap and don’t want to pay for hosting so that limits me to static HTML files.

Now I know there are a host, pun intended, of [libraries](https://github.com/11ty/eleventy) out there for generating static HTML files from various sources. But there were certain customization options I was after plus the integration could be just as painful depending on what I wanted to add in the future. So I decided to build my own in Kotlin with the intention of not just learning the language but blogging about the development processitself.

## Zebec

Enter [Zebec](https://github.com/ssoper/Zebec), a “static site compiler” that uses a mix of custom DSLs, Markdown and other source files to construct a static site that can be delivered via plain old HTML files. I’m by no means done with it but after nearly 2½ months of development I can safely say that it is at a point where I can talk about it. I even have a pull request on it already (thanks [Dan](https://github.com/dan-0) 🙋🏻!).

When I started on it, I figured I’d be done with the first version in a few weeks. Indeed, I had a pretty solid grasp of the language by that point but that’s just a small part of the equation. Learning about Maven, bringing in Kotlinx libraries and working with Java have turned out to be a _much_ larger factor than I initially anticipated and I’m looking forward to sharing that journey with you.

---

Finally, I’d just like to mention real quick what Kotlin has given back to me. For many, programming is just a means to an end and that’s ok. But for some it’s about the joy of learning something new or stumbling on a solution you’d never considered. Those were the original reasons I’d gotten into programming 25 years ago but in recent years I’d forgotten that. Kotlin rekindled that sense of discovery in me and for that I’ll always be grateful to the fine folks at [JetBrains](https://www.jetbrains.com/) who have put so much time and energy into the development of this beautiful language over the past 10 years.

