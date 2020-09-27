[//]: # (zauthor: Sean Soper)
[//]: # (ztitle: Reading from the Command-Line in Kotlin)
[//]: # (zsubtitle: And how to make short work of complex problems using higher order functions, lambdas and generics)
[//]: # (zimage: https://unsplash.com/photos/uZqJVqwFxMQ)
[//]: # (ztags: kotlin, batil, functional, regex)

When it comes to breaking down complex problems into smaller ones Kotlin offers a full range of functional tools and patterns to make your job easier. Building on our previous entry around [building a command-line application](/blog/creating_command_line_app_kotlin.html) we will put several techniques to use to build a robust solution to the problem of accepting and validating user input.

## Parse with Class

Let’s add a Kotlin class which we will be able to create instances of to parse our input. We’re going to call it the very originally named `CommandLineParser`. By bundling all of our parsing functionality into a single file we achieve two goals, [separation of concerns](https://en.wikipedia.org/wiki/Separation_of_concerns) and [testability](https://en.wikipedia.org/wiki/Software_testability), both of which go a long ways towards ensuring ease of maintenance and extensability in the future.

Our parser will be pretty simple as it will accept only three arguments to start with: `help`, `verbose` and `config` the latter of which will be a string value pointing to a configuration file. However we will build it in such a way that if we wanted to add arguments that took integers as values it wouldn’t be difficult to do.

A summary of this new functionality, including the code highlighted below, can be found in [these commits](https://github.com/ssoper/Batil/compare/9a3d6a5..8428dd6).

## Data Class

While Swift has the `struct`, Kotlin has the `data class`. They share a similar goal of providing a general-purpose flexible construct to store values. However they differ significantly in where they are stored. While a Swift `struct` is stored in the stack, a `data class`, being the object that it is, is stored in the heap along with every other reference type instance.

    data class Parsed(val pathToConfigFile: Path,
                      val verbose: Boolean)

This class will provide us a means of encapsulating the parsed results of whatever command-line input was passed.

## Generics

[Generics](https://kotlinlang.org/docs/reference/generics.html) are a means of allowing a function to return more than one type of value while also providing compile-time checks. An example of this would be a sorting function which can take two strings, two integers, etc. and return which one is greater. You could write a sorting function for each type _or_ you could write one sorting function that simply takes two of the same type regardless of that type.

In our example we are using generics, noted by the `T` such as in `<T: Any>`, to ensure that the type of the value parsed out of the command-line input is what is returned. Without generics we would need to write a similar but different function that parsed integers for say a port number vs. parsing the path to a configuration file that would return a string.

    private fun<T: Any> parseArguments(regex: Regex, transform: (String) -> T): List<T> {
        val match = fun (str: String): T? {
            return regex.find(str)?.let {
                if (it.groups.count() < 2) {
                    return null
                }
                
                return it.groups[1]?.let {
                    transform(it.value.removeSurrounding("\"").removeSurrounding("'"))
                }
            }
        }
        
        return args.mapNotNull(match)
    }

## HOFs and Lambdas

Higher Order Functions (HOFs) and lambdas are two sides of the same coin. HOFs are functions that can take functions as arguments. Lambdas are a type of function which can be passed as an argument to a HOF. Lambdas show up everywhere in functional programming but it should be noted they are _distinct_ from [anonymous functions](https://gist.github.com/ericelliott/414be9be82128443f6df). So just like a sort function will  take a lambda as an expression to override the default sorting, our function will take a lambda to decide how to parse the input for that specific command-line argument.

    private fun getPath(type: String): Path? {
        val regex = Regex("^-${type}=(.*)")
        
        return parseArguments(regex) {
            if (it.startsWith("/")) {
                Paths.get(it)
            } else {
                Paths.get(basePath, it)
            }
        }.firstOrNull()
    }

In our case a typical value would be `-config=/path/to/config` along with a regular expression and the lambda. Most of the magic happens in `parseArguments` which uses the anonymous function stored in `match` to break the input up into logical parts which are then handed over to the lambda as a `List`. While it seems like overkill for parsing a `String`, it could just as easily be used to [parse an integer](https://github.com/ssoper/Zebec/commit/76148c5d284e78d95116d0c527e74627f199dbcc#diff-ca1dfc769a491b093d314c64adf2b638R76).

    private fun getPort(): Int {
        val regex = Regex("^-port=(\\d{2,5})")
        return parseArguments(regex) {
          it.toInt()
        }.firstOrNull() ?: defaultPort
    }

In this example the string values are being converted and returned as an `Int` while using the exact same code under the hood to break up the initial command-line input. That is the power of generics, HOFs and lambdas all working together to break down complexity into bite-sized reusable chunks.

## Summary

Using this new parser functionality is pretty simple thanks to our componentized approach. Within `Core.kt` we need only update the `main` function to look like this.

    @JvmStatic fun main(args: Array<String>) {
        val cli = CommandLineParser(args)
        
        if (cli.shouldShowHelp) {
            cli.showHelp()
            exitProcess(0)
        }
        
        val parsed = try {
            cli.parse()
        } catch (exception: ConfigFileNotFound) {
            println("❌ ${exception.localizedMessage}")
            cli.showHelp()
            exitProcess(1)
        }
        
        println("verbose set to ${parsed.verbose}")
        println("config path set to ${parsed.pathToConfigFile}")
    }

Of course, neither you or I are the first ones to stumble upon this problem which is why libraries such as [Clikt](https://ajalt.github.io/clikt/) are available to use with your command-line applications should you not feel like building your own solution. Even if you do go with a pre-packaged command-line parser, there is plenty of opportunity to use the full range of functional tools provided by Kotlin to help reduce the complexity in your code.
