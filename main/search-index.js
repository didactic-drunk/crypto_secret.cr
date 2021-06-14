crystal_doc_search_index_callback({"repository_name":"crypto-secret","body":"# crypto-secret.cr\n[![Crystal CI](https://github.com/didactic-drunk/crypto-secret.cr/actions/workflows/crystal.yml/badge.svg)](https://github.com/didactic-drunk/crypto-secret.cr/actions/workflows/crystal.yml)\n[![GitHub release](https://img.shields.io/github/release/didactic-drunk/crypto-secret.cr.svg)](https://github.com/didactic-drunk/crypto-secret.cr/releases)\n![GitHub commits since latest release (by date) for a branch](https://img.shields.io/github/commits-since/didactic-drunk/crypto-secret.cr/latest)\n[![Docs](https://img.shields.io/badge/docs-available-brightgreen.svg)](https://didactic-drunk.github.io/crypto-secret.cr/main)\n\nSecrets hold sensitive information\n\nThe Secret interface manages limited time access to the secret and securely erasing the secret when no longer needed.\n\nSecret providers may implement additional protections via:\n* `#noaccess`, `#readonly` or `readwrite`.\n* Using [mprotect]() to control access\n* Encrypting the data when not in use\n* Deriving keys on demand from a HSM\n* Preventing the Secret from entering swap ([mlock]())\n* Preventing the Secret from entering core dumps\n* Other\n\n\n## Installation\n\n1. Add the dependency to your `shard.yml`:\n\n   ```yaml\n   dependencies:\n     crypto-secret:\n       github: didactic-drunk/crypto-secret\n   ```\n\n2. Run `shards install`\n\n## Usage\n\n```crystal\nrequire \"crypto-secret/not\"\n\n# `Not` isn't actually a secret and does none of what the comments say\n# Replace `Not` with a secure implementation like [Sodium::SecureBuffer](https://didactic-drunk.github.io/sodium.cr/master/Sodium/SecureBuffer.html)\nsecret = Crypto::Secret::Not.new 32\nsecret.wipe do\n  secret.readonly do |slice|\n    # May only read slice\n  end\n  secret.readwrite do |slice|\n    # May read or write to slice\n  end\nend # secret is erased\n```\n\n## What is a Secret?\n\n<strike>Secrets are Keys</strike>\nThat's complicated and specific to the application.  Some examples:\n\n* Passwords\n* A crypto key is always a Secret.  Except when used for verification (sometimes)\n* A decrypted password vault (but it's not a Key)\n\nNot secrets:\n\n* Digest output.  Except when used for key derivation, then it's a Secret, including the Digest state\n* IO::Memory or writing a file.  Except when the file is a password vault, cryptocurrency wallet, encrypted mail/messages, goat porn, maybe normal porn, sometimes scat porn, occassionally furry, not vanilla porn\n\n## Why?\n\nThe Secret interface is designed to handle varied levels of confidentiality with a unified API for cryptography libraries.\n\nThere is no one size fits all solution.  Different applications have different security requirements.  Sometimes for the same algorithm.\n\nA master key (kgk) may reside on a HSM and generate subkeys on demand.\nOr for most applications the master key may use best effort protection using a combination of [guard pages, mlock, mprotect].\nOther keys in the same application may handle a high volume of messages where [guard pages, mlock, mprotect] overhead is too high.\nA key verifying a public key signature may not be Secret.\n\n## How do I use a Secret returned by a shard?\n\nThat depends on what you use it for.\n\n#### Using a Secret key\n\nTODO\n\n#### Using a Secret to hold decrypted file contents:\n```\nkey = ...another Secret...\nencrypted_str = File.read(\"filename\")\ndecrypted_size = encrypted_str.bytesize - mac_size\nfile_secret = Crypto::Secret::Default.new decrypted_size\nfile_secret.wipe do\n  file_secrets.readwrite do |slice|\n    decrypt(key: key, src: encrypted_str, dst: slice)\n\n    # Do something with file contents in slice\n  end\nend # Decrypted data is erased\n```\n\n## When should I use a Secret?\n\nWhen implementing an encryption class, return `Secret` keys with a sane default implementation that suits the average use for your class.  Several default implementations will be provided.\nAllowing overriding the default returned key and/or allow users of your class to provide their own `Secret` for cases where they need more or less protection.\n\nExample:\n\n```\nclass SimplifiedEncryption\n  # Allow users of your library to provide their own Secret key.  Also provide a sane default.\n  def encrypt(data : Bytes | String, key : Secret? = nil) : {Secret, Bytes}\n    key ||= Crypto::Secret::Default.random\n    ...\n    {key, encrypted_slice}\n  end\nend\n```\n\n## What attacks does a Secret protect against?\n\nTODO: describe implementations\n\n## Other languages/libraries\n\nrust: [secrets](https://github.com/stouset/secrets/)\nc: [libsodium](https://github.com/jedisct1/libsodium-doc/blob/master/helpers/memory_management.md#guarded_heap_allocations)\ngo: [memguard](https://github.com/awnumar/memguard)\nhaskell: [securemem](https://hackage.haskell.org/package/securemem)\nc#: [SecureString](https://docs.microsoft.com/en-us/dotnet/api/system.security.securestring)\n\n## Implementing a new Secret holding class\n\n**Only intended for use by crypto library authors**\n\n```\nclass MySecret\n  include Crypto::Secret\n\n  def initialize(size)\n    # allocate storage\n    # optionally mlock\n  end\n\n  def to_slice(& : Bytes -> Nil)\n    # The yielded Slice only needs to be valid within the block\n    # yield Slice.new(pointer, size)\n  ensure\n    # optionally reencrypt or signal HSM\n  end\n\n  def bytesize : Int32\n    # return the size\n  end\n\n  # optionally override [noaccess, readonly, readwrite]\n  # optionally override (almost) any other method with an implementation specific version\nend\n\n```\n\n## Contributing\n\n**Open a discussion before creating PR's**\n\n1. Fork it (<https://github.com/your-github-user/crypto-secret/fork>)\n2. Create your feature branch (`git checkout -b my-new-feature`)\n3. Commit your changes (`git commit -am 'Add some feature'`)\n4. Push to the branch (`git push origin my-new-feature`)\n5. Create a new Pull Request\n\n## Contributors\n\n- [didactic-drunk](https://github.com/didactic-drunk) - current maintainer\n","program":{"html_id":"crypto-secret/toplevel","path":"toplevel.html","kind":"module","full_name":"Top Level Namespace","name":"Top Level Namespace","abstract":false,"superclass":null,"ancestors":[],"locations":[],"repository_name":"crypto-secret","program":true,"enum":false,"alias":false,"aliased":null,"aliased_html":null,"const":false,"constants":[],"included_modules":[],"extended_modules":[],"subclasses":[],"including_types":[],"namespace":null,"doc":null,"summary":null,"class_methods":[],"constructors":[],"instance_methods":[],"macros":[],"types":[]}})