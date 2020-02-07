[//]: # (zauthor: Sean Soper)
[//]: # (ztitle: Advanced Android Programming With Kotlin)
[//]: # (zsubtitle: Kotlin-exclusive features you should be using)
[//]: # (zimage: https://unsplash.com/photos/ZBWtD2UmMzA)
[//]: # (ztags: android, programming, kotlin)

Unlike Java, where we need to write everything, a Kotlin compiler can understand the code and write the boilerplate code under the hood — for example, it can infer types in variable declarations. This increases productivity and saves time.

## Kotlin makes Android development more fun

If you search the web, you’ll find tons of ways in which Kotlin solved many of Java’s pain points and how features of Kotlin aim to make Android development more fun.

[As Open Source For You describes](https://google.com)

> Kotlin is a multi-platform programming language that is concise, safe, interoperable and tool-friendly. It is a statically-typed programming language that runs on the Java virtual machine and can also be compiled to the JavaScript source code or can use the LLVM compiler infrastructure.

Whatever the programming advancements you’re learning here, most of them are applicable for other platforms where Kotlin is used for development.

---

This can be done with a special declaration called extensions. For example, we can write new functionalities to a class in the third-party library that can’t be modified and use them as the actual functions in the class. These functions are called extension functions.

    import hello
    println("hello world")

## String extensions

Until now, we’ve looked at view extensions. Next, let’s concentrate on some validations we can do using extensions.
