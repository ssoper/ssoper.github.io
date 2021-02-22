[//]: # (zauthor: Sean Soper)
[//]: # (ztitle: Storing Secrets Securely in Kotlin)
[//]: # (zsubtitle: Building a simple key store using standard Java cryptography libraries)
[//]: # (zimage: https://unsplash.com/photos/L4hg5o67jdw)
[//]: # (ztags: kotlin, batil, etrade, testing, java)

It’s not uncommon for applications to occasionally need to store secrets. The security of those secrets relies partly on the underlying cryptography and partly on the layout of the scheme. In this implementation, we will provide sensible defaults using [dependency injection](https://medium.com/better-programming/kotlin-and-the-simplest-dependency-injection-tutorial-ever-b437d8c338fe) to simplify both testing and deployment to a production-ready system.

> This post references work previously done in [Using Retrofit to Integrate with an API](/blog/using_retrofit_integrate_api.html).

## KeyStore

We will be making use of the [KeyStore](https://docs.oracle.com/javase/7/docs/api/java/security/KeyStore.html) class which offers three methods for storing secrets. Let’s go to the documentation.

* `PrivateKeyEntry` – This type of entry holds a cryptographic `PrivateKey`, which is optionally stored in a protected format to prevent unauthorized access. It is also accompanied by a certificate chain for the corresponding public key.
* `TrustedCertificateEntry` – This type of entry contains a single public key `Certificate` belonging to another party. It is called a trusted certificate because the keystore owner trusts that the public key in the certificate indeed belongs to the identity identified by the subject (owner) of the certificate.
* `SecretKeyEntry` – This type of entry holds a cryptographic `SecretKey`, which is optionally stored in a protected format to prevent unauthorized access.

Since our needs are pretty basic we can get what we need out of the last option, `SecretKeyEntry`, without the hassle of having to deal with any certificates. We will store our secrets on the filesystem and the structure will look like this.

    /Users/home_dir
      └─┐.keystore_dir
         ├─ key.password
         └─ key.store

The `key.password` is where we will store the password that can lock or unlock our secrets. Ideally, in a production system it should be located in a different directory than the `key.store` which holds our actual secrets.

## Keeping Secrets

Let’s start with a `Secrets` class and the functionality to retrieve the file or create it if it doesn’t exist.

    class Secrets(private val keyStorePath: Path = Paths.get(System.getProperty("user.home"), ".secrets", "key.store"),
                  private val passwordPath: Path = Paths.get(System.getProperty("user.home"), ".secrets", "key.password")) {
    
        private val keyStoreFile: File
            get() {
                val dirPath = keyStorePath.parent
              
                if (!dirPath.toFile().exists()) {
                    dirPath.toFile().mkdirs()
                }
              
                return keyStorePath.toFile()
            }
        }
        
    }

Now we’ll want to load the contents of that file into a `KeyStore` or return a null entry.

    private val keyStore: KeyStore by lazy {
        val keyStore = KeyStore.getInstance(KeyStore.getDefaultType())
      
        if (keyStoreFile.exists()) {
           val stream = FileInputStream(keyStoreFile)
           try {
               keyStore.load(stream, password)
           } catch (exception: java.io.IOException) {
               throw CachedTokenException(keyStorePath)
           }
        } else {
           keyStore.load(null, password)
        }
      
        keyStore
    }

We’ll also want a means of saving and retrieving our password that can lock and unlock the store. If the password file doesn’t exist then we will generate a new password using `UUID.randomUUID()` and save that as our password.

    private val password: CharArray by lazy {
        val dirPath = passwordPath.parent
        if (!dirPath.toFile().exists()) {
            dirPath.toFile().mkdirs()
        }
      
        val path = passwordPath.toFile()
      
        if (path.exists()) {
            path.readText().toCharArray()
        } else {
            val uuid = UUID.randomUUID().toString()
            path.writeText(uuid)
            uuid.toCharArray()
        }
    }

Note that both of these properties make use of the [lazy](https://kotlinlang.org/docs/delegated-properties.html#lazy-properties) keyword which means they aren’t computed until after first access. And once computed, the results are remembered so they don’t have to be computed again, useful for operations like loading data out of a file. As well, `lazy` getters don’t require a return statement since they are technically a lambda of type `Lazy<T>`.

## Retrieve Entries

With the basics of our `KeyStore` and password handled, retrieving entries becomes fairly simple. Note however that the `getEntry` method on `KeyStore` is incorrectly marked as non-nullable. That means we need to use an old fashioned null check instead of an optional.

    fun getEntry(entry: String): String? {
        if (!keyStoreFile.exists()) {
            return null
        }
        
        val protection = KeyStore.PasswordProtection(password)
        val secret = keyStore.getEntry(entry, protection)
        
        return if (secret != null) {
            String((secret as KeyStore.SecretKeyEntry).secretKey.encoded)
        } else {
            null
        }
    }

## Save Entries

Adding the ability to save entries is the last bit of functionality we need.

    fun setEntry(entry: String, value: String) {
        val protection = KeyStore.PasswordProtection(password)
        val encoded = SecretKeySpec(value.toByteArray(), "AES")
        
        keyStore.setEntry(entry, KeyStore.SecretKeyEntry(encoded), protection)
        
        val stream = FileOutputStream(keyStoreFile)
        stream.use {
            keyStore.store(it, password)
        }
    }

We can also add a nice little convenience function for quickly clearing the store if need be.

    fun destroy() {
        Files.deleteIfExists(keyStorePath)
        Files.deleteIfExists(passwordPath)
    }

## Summary

With our simple key store, we can quickly retrieve and save values that we’d prefer to remain secret. Unit testing this functionality isn’t difficult either through the use of temporary directories. While this implementation avoids any references to the E*TRADE API, saving API keys is precisely why I created it.

A summary of these commits can be found [here](https://github.com/ssoper/Batil/pull/7/files).