crystal_doc_search_index_callback({"repository_name":"crypto-secret","body":"# crypto-secret.cr\n[![Crystal CI](https://github.com/didactic-drunk/crypto-secret.cr/actions/workflows/crystal.yml/badge.svg)](https://github.com/didactic-drunk/crypto-secret.cr/actions/workflows/crystal.yml)\n[![GitHub release](https://img.shields.io/github/release/didactic-drunk/crypto-secret.cr.svg)](https://github.com/didactic-drunk/crypto-secret.cr/releases)\n![GitHub commits since latest release (by date) for a branch](https://img.shields.io/github/commits-since/didactic-drunk/crypto-secret.cr/latest)\n[![Docs](https://img.shields.io/badge/docs-available-brightgreen.svg)](https://didactic-drunk.github.io/crypto-secret.cr/main)\n\nSecrets hold sensitive information\n\nThe Secret interface manages limited time access to a secret and securely erases the secret when no longer needed.\n\nSecret providers may implement additional protections via:\n* `#noaccess`, `#readonly` or `#readwrite`\n* Using [mprotect]() to control access\n* Encrypting the data when not in use\n* Deriving keys on demand from a HSM\n* Preventing the Secret from entering swap ([mlock]())\n* Preventing the Secret from entering core dumps\n* Other\n\n\n## Installation\n\n1. Add the dependency to your `shard.yml`:\n\n   ```yaml\n   dependencies:\n     crypto-secret:\n       github: didactic-drunk/crypto-secret\n   ```\n\n2. Run `shards install`\n\n## Usage\n\n#### Rules:\n1. Secrets should be erased (wiped) ASAP\n2. Secrets are only available within a `readonly` or `readwrite` block\n3. Secrets are not thread safe except for the provided `Slice` (only when reading) within a single `readonly` or `readwrite` block \n\n\n```crystal\nrequire \"crypto-secret/bidet\"\n\n# Bidet is a minimal but fast secret implementation\nsecret = Crypto::Secret::Bidet.new 32\n# Don't forget to wipe!\nsecret.wipe do\n  secret.readonly do |slice|\n    # May only read slice\n  end\n  secret.readwrite do |slice|\n    # May read or write to slice\n  end\nend # secret is erased\n```\n\n#### Breaking the rules:\n\nIf you need thread safety :\n1. Switch to a Stateless Secret\n2. Or switch the Secret's state to readonly or readwrite after construction and never switch it again.  [sodium.cr]() makes use of this technique to provide thread safe encryption/decryption\n3. Or wrap all access in a Mutex (compatible with all Secret classes)\n\nIf you need more better performance:\n* Consider 1. or 2.\n\nIf you need compatibility with any `Secret`:\n* Always use a `Mutex`\n* Never rely on 1. or 2.\n\n#### Converting `Bytes` to a `Secret`\n```crystal\nslice = method_that_return_bytes()\nsecret = Crypto::Secret::Bidet.move_from slice # erases slice\n# or\nsecret = Crypto::Secret::Bidet.copy_from slice\n```\n\n## What is a Secret?\n\n<strike>Secrets are Keys</strike>\nThat's complicated and specific to the application.  Some examples:\n\n* Passwords\n* A crypto key is always a Secret.  Except when used for verification (sometimes)\n* A decrypted password vault (but it's not a Key)\n\nNot secrets:\n\n* Digest output.  Except when used for key derivation, then it's a Secret, including the Digest state\n* IO::Memory or writing a file.  Except when the file is a password vault, cryptocurrency wallet, encrypted mail/messages, goat porn, maybe \"normal\" porn, sometimes scat porn, occassionally furry, not vanilla porn\n\n## Why?\n\nThe Secret interface is designed to handle varied levels of confidentiality with a unified API for cryptography libraries.\n\nThere is no one size fits all solution.  Different applications have different security requirements.  Sometimes for the same algorithm.\n\nA master key (kgk) may reside on a HSM and generate subkeys on demand.\nOr for most applications the master key may use a best effort approach using a combination of [guard pages, mlock, mprotect].\nOther keys in the same application may handle a high volume of messages where [guard pages, mlock, mprotect] overhead is too high.\nA key verifying a public key signature may not be Secret (but is a Secret::Not).\n\n## How do I use a Secret returned by a shard?\n\nThat depends on what you use it for.\n\n#### Using a Secret key\n\nTODO\n\n#### Using a Secret to hold decrypted file contents:\n```\nkey = ...another Secret...\nencrypted_str = File.read(\"filename\")\ndecrypted_size = encrypted_str.bytesize - mac_size\nfile_secret = Crypto::Secret::Default.new decrypted_size\nfile_secret.wipe do\n  file_secrets.readwrite do |slice|\n    decrypt(key: key, src: encrypted_str, dst: slice)\n\n    # Do something with file contents in slice\n  end\nend # Decrypted data is erased\n```\n\n## When should I use a Secret?\n\nWhen implementing an encryption class return `Secret` keys with a sane default implementation that suits the average use for your class.  Several default implementations will be provided.\nAllow overriding the default returned key and/or allow users of your class to provide their own `Secret` for cases where they need more or less protection.\n\nExample:\n\n```\nclass SimplifiedEncryption\n  # Allow users of your library to provide their own Secret key.  Also provide a sane default.\n  def encrypt(data : Bytes | String, key : Secret? = nil) : {Secret, Bytes}\n    key ||= Crypto::Secret::Default.random\n    ...\n    {key, encrypted_slice}\n  end\nend\n```\n\n## What attacks does a Secret protect against?\n\n* Timing attacks when comparing secrets by overriding `==`\n* Leaking data in to logs by overriding `inspect`\n* Wiping memory when the secret is no longer in use\n\nTODO: describe implementations\n\n\n## Other languages/libraries\n\n* rust: [secrets](https://github.com/stouset/secrets/)\n* c: [libsodium](https://github.com/jedisct1/libsodium-doc/blob/master/helpers/memory_management.md#guarded_heap_allocations)\n* go: [memguard](https://github.com/awnumar/memguard)\n* haskell: [securemem](https://hackage.haskell.org/package/securemem)\n* c#: [SecureString](https://docs.microsoft.com/en-us/dotnet/api/system.security.securestring)\n\n## Implementing a new Secret holding class\n\n**Only intended for use by crypto library authors**\n\n```\nclass MySecret\n  # Choose one\n  include Crypto::Secret::Stateless\n  include Crypto::Secret::Stateful\n\n  def initialize(size)\n    # allocate or reference storage\n    # optionally mlock\n  end\n\n  def to_slice(& : Bytes -> Nil)\n    # The yielded Slice only needs to be valid within the block\n    # yield Slice.new(pointer, size)\n  ensure\n    # optionally reencrypt or signal HSM\n  end\n\n  def bytesize : Int32\n    # return the size\n  end\n\n  # optionally override [noaccess, readonly, readwrite]\n  # optionally override (almost) any other method with an implementation specific version\nend\n\n```\n\n## Contributing\n\n**Open a discussion or issue before creating PR's**\n\n1. Fork it (<https://github.com/your-github-user/crypto-secret/fork>)\n2. Create your feature branch (`git checkout -b my-new-feature`)\n3. Commit your changes (`git commit -am 'Add some feature'`)\n4. Push to the branch (`git push origin my-new-feature`)\n5. Create a new Pull Request\n\n## Contributors\n\n- [didactic-drunk](https://github.com/didactic-drunk) - current maintainer\n","program":{"html_id":"crypto-secret/toplevel","path":"toplevel.html","kind":"module","full_name":"Top Level Namespace","name":"Top Level Namespace","abstract":false,"superclass":null,"ancestors":[],"locations":[],"repository_name":"crypto-secret","program":true,"enum":false,"alias":false,"aliased":null,"aliased_html":null,"const":false,"constants":[],"included_modules":[],"extended_modules":[],"subclasses":[],"including_types":[],"namespace":null,"doc":null,"summary":null,"class_methods":[],"constructors":[],"instance_methods":[],"macros":[{"id":"test_secret_class(tosclass)-macro","html_id":"test_secret_class(tosclass)-macro","name":"test_secret_class","doc":null,"summary":null,"abstract":false,"args":[{"name":"sclass","doc":null,"default_value":"","external_name":"to","restriction":""}],"args_string":"(to sclass)","location":{"filename":"src/crypto-secret/test.cr","line_number":1,"url":"https://github.com/didactic-drunk/crypto-secret.cr/blob/437b3da6b13412b8c70b6638b14cefffbf51f50d/src/crypto-secret/test.cr#L1"},"def":{"name":"test_secret_class","args":[{"name":"sclass","doc":null,"default_value":"","external_name":"to","restriction":""}],"double_splat":null,"splat_index":null,"block_arg":null,"visibility":"Public","body":"  describe \n{{ sclass }}\n do\n    sclass = \n{{ sclass }}\n\n\n    it \"returns a random secret\" do\n      secret1 = sclass.new 8\n      secret2 = sclass.random 8\n      secret1.should_not \neq secret2\n    \nend\n\n    it \"copies & wipes on .move\" do\n      ksize = 4\n      key1 = Bytes.new ksize\n      key1[1] = 1_u8\n      key2 = key1.dup\n      secret = sclass.move_from key2\n\n      secret.readonly \n{ |s| s.should \neq key1 }\n      key2.should \neq Bytes.new(ksize)\n    \nend\n\n    it \"copies & preserves on .copy\" do\n      ksize = 2\n      key1 = Bytes.new ksize\n      key1[1] = 1_u8\n      key2 = key1.dup\n      secret = sclass.copy_from key2\n\n      secret.readonly \n{ |s| s.should \neq key1 }\n      key2.should \neq key1\n    \nend\n\n    it \"compares with ==\" do\n      ksize = 32\n      key = Bytes.new ksize\n      key[1] = 1_u8\n\n      secret1 = sclass.copy_from key\n      secret1.readonly \n{ |s| s.should \neq key }\n\n      secret2 = sclass.copy_from key\n\n      (secret1 == secret2).should be_true\n      secret1.readonly do |s1|\n        secret2.readonly do |s2|\n          (s1 == s2).should be_true\n        \nend\n      \nend\n    \nend\n\n    it \"dups\" do\n      ksize = 2\n      key = Bytes.new ksize\n      key[1] = 1_u8\n\n      secret1 = sclass.copy_from key\n      secret2 = secret1.dup\n      (secret1 == secret2).should be_true\n    \nend\n\n    pending \"check dup state\" \n{ }\n\n    it \"bytesize\" do\n      secret = sclass.new 5\n      secret.bytesize.should \neq 5\n      secret.readonly \n{ |s| s.bytesize.should \neq 5 }\n    \nend\n\n    it \"doesn't leak key material when inspecting\" do\n      secret = sclass.new 5\n\n      secret.to_s.should_not match /Bytes|Slice|StaticArray/\n      secret.inspect.should_not match /Bytes|Slice|StaticArray/\n\n      secret.inspect.should match /\\(\\*\\*\\*SECRET\\*\\*\\*\\)$/\n    \nend\n  \nend\n\n"}}],"types":[{"html_id":"crypto-secret/Slice","path":"Slice.html","kind":"struct","full_name":"Slice(T)","name":"Slice","abstract":false,"superclass":{"html_id":"crypto-secret/Struct","kind":"struct","full_name":"Struct","name":"Struct"},"ancestors":[{"html_id":"crypto-secret/Comparable","kind":"module","full_name":"Comparable","name":"Comparable"},{"html_id":"crypto-secret/Indexable","kind":"module","full_name":"Indexable","name":"Indexable"},{"html_id":"crypto-secret/Enumerable","kind":"module","full_name":"Enumerable","name":"Enumerable"},{"html_id":"crypto-secret/Iterable","kind":"module","full_name":"Iterable","name":"Iterable"},{"html_id":"crypto-secret/Struct","kind":"struct","full_name":"Struct","name":"Struct"},{"html_id":"crypto-secret/Value","kind":"struct","full_name":"Value","name":"Value"},{"html_id":"crypto-secret/Object","kind":"class","full_name":"Object","name":"Object"}],"locations":[{"filename":"src/crypto-secret/lib.cr","line_number":7,"url":"https://github.com/didactic-drunk/crypto-secret.cr/blob/437b3da6b13412b8c70b6638b14cefffbf51f50d/src/crypto-secret/lib.cr#L7"}],"repository_name":"crypto-secret","program":false,"enum":false,"alias":false,"aliased":null,"aliased_html":null,"const":false,"constants":[],"included_modules":[{"html_id":"crypto-secret/Comparable","kind":"module","full_name":"Comparable","name":"Comparable"},{"html_id":"crypto-secret/Indexable","kind":"module","full_name":"Indexable","name":"Indexable"}],"extended_modules":[],"subclasses":[],"including_types":[],"namespace":null,"doc":"A `Slice` is a `Pointer` with an associated size.\n\nWhile a pointer is unsafe because no bound checks are performed when reading from and writing to it,\nreading from and writing to a slice involve bound checks.\nIn this way, a slice is a safe alternative to `Pointer`.\n\nA Slice can be created as read-only: trying to write to it\nwill raise. For example the slice of bytes returned by\n`String#to_slice` is read-only.","summary":"<p>A <code><a href=\"Slice.html\">Slice</a></code> is a <code>Pointer</code> with an associated size.</p>","class_methods":[],"constructors":[],"instance_methods":[{"id":"wipe-instance-method","html_id":"wipe-instance-method","name":"wipe","doc":null,"summary":null,"abstract":false,"args":[],"args_string":"","args_html":"","location":{"filename":"src/crypto-secret/lib.cr","line_number":8,"url":"https://github.com/didactic-drunk/crypto-secret.cr/blob/437b3da6b13412b8c70b6638b14cefffbf51f50d/src/crypto-secret/lib.cr#L8"},"def":{"name":"wipe","args":[],"double_splat":null,"splat_index":null,"yields":null,"block_arg":null,"return_type":"","visibility":"Public","body":"LibC.explicit_bzero(to_unsafe, bytesize)"}}],"macros":[],"types":[]}]}})