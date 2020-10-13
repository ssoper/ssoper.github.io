[//]: # (zauthor: Sean Soper)
[//]: # (ztitle: Reading a YAML Configuration File in Kotlin)
[//]: # (zsubtitle: Adding a dependency on Jackson in your Gradle file)
[//]: # (zimage: https://unsplash.com/photos/xDjcU1Pglro)
[//]: # (ztags: kotlin, batil, jackson, yaml)

During the heyday of Ruby development 10 years ago the YAML format was all the rage. But as developers moved towards Javascript-powered frameworks like [node](https://nodejs.org/) the preferred format for configuration files moved with them to JSON. It was the Java community, which had been enthrall to XML for the better part of a decade, that began to roll out better support for YAML.

This post builds on work previously done in [Reading from the Command-Line in Kotlin](/blog/reading_command_line.html).

## Structure

While command-line switches can take you pretty far they eventually become cumbersome to manage and it’s at this point that I like to introduce a configuration file. Ours will be in YAML format and will reference account information that is required to obtain an E*TRADE token. I’m also aiming to keep it extensible should we want to access other brokerage accounts.

Here is the basic structure:

    etrade:
      sandbox:
        key: value
        secret: value
      production:
        key: value
        secret: value
      username: value
      password: value        

When creating a `data class` to map to this structure we should start with the leaf nodes.

    data class EtradeAuth(val key: String,
                          val secret: String)

This single class can be used for both the `sandbox` and `production` values.

    data class EtradeConfiguration(val sandbox: EtradeAuth,
                                   val production: EtradeAuth,
                                   val username: String,
                                   val password: String)
                                   
    data class Configuration(val etrade: EtradeConfiguration

Note that none of these fields are optional or have default values so all the fields are required if we are to ingest the YAML file successfully.

## Jackson

I don’t have a whole lot to add to these already fantastic [blog](https://www.mkammerer.de/blog/kotlin-and-yaml-part-2/) [posts](https://www.baeldung.com/jackson-yaml) on integrating and using Jackson in your project. But I do want to note some of the steps necessary to ensure the JAR file you build has all the required dependencies.

Since we are using Maven we can [search](https://search.maven.org/search?q=fasterxml%20jackson%20dataformat) for the Jackson dependency and add them to our Gradle file. At a minimum we will need the Kotlin module and YAML dataformat either of which will pull in the main Jackson dependency. 

    dependencies {
        implementation("org.jetbrains.kotlin:kotlin-stdlib")
        
        // These are the new dependencies
        implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.11.2")
        implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:2.11.2")
    }

Note that the string is split into three parts with a `:` as the separator. The version specification, which follows [semver](https://semver.org/), is unnecessary if you want to let the version point to whatever is the latest available.

## Ingest

Let’s create a new class `IngestConfiguration` where we can centralize this functionality. Using some of the fantastic pathing and file functionality provided by Java out of the box, we can use the current directory to search for a file called `batil.yaml`, read it in and pass it to Jackson to parse.

    fun parse(): Configuration {
        val path = Paths.get(basePath, "batil.yaml")
        val mapper = ObjectMapper(YAMLFactory())
        mapper.registerModule(KotlinModule())
        
        return try {
            Files.newBufferedReader(path).use {
                mapper.readValue(it, Configuration::class.java)
            }
        } catch (exception: MissingKotlinParameterException) {
            println("Could not read YAML file!")
            println(exception.message)
        }
    }

To ensure our JAR file has all the necessary dependencies we’ll want to go into our `Project Structure` ➡ `Artifacts`, select the dependencies that came down with Jackson, right click and select `Extract Into Output Root`. Without this step the JAR will still compile but will fail when it attempts to ingest the YAML files.

<img src="/images/blog/reading_yaml_configuration_file_kotlin/extract.png" alt="Structure Screenshot" class="img-fluid rounded embedded">

Note that after adding a dependency you may need to reaffirm the `Inherit project compile output path` radio button selection under `Modules`. You’ll also want to update your `.gitignore` to avoid accidentally committing any tokens that should remain a secret. And as always, a summary of these commits can be found [here](https://github.com/ssoper/Batil/compare/8428dd..35dba93).
