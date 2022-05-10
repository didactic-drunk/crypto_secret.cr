require "./lib"
require "./class_methods"

macro finished
  {% for key, klass in Crypto::Secret::REGISTERED_USES %}
    require {{ Crypto::Secret::REGISTERED_LOAD_PATHS[klass] }}
    Crypto::Secret::REGISTERED[{{key.id}}] = {{klass}}
  {% end %}
end

# Interface to hold sensitive information (often cryptographic keys)
#
# ## Which class should I use?
# * `Crypto::Secret::Key` - Use with small (<= 4096 bytes) keys
# * `Crypto::Secret::Large` - Use for decrypted data that may stress mlock limits
# * `Crypto::Secret::Not` - Only use when you're sure the data isn't secret.  0 overhead.  No wiping.
#
# Other shards may provide additional `Secret` types ([sodium.cr](https://github.com/didactic-drunk/sodium.cr))
@[Experimental]
module Crypto::Secret
  class Error < Exception
    class KeyWiped < Error
    end

    class InvalidStateTransition < Error
    end

    # Check RLIMIT_MEMLOCK if you receive this
    class OutOfMemory < Error
    end
  end

  enum State
    Cloning
    Wiped
    Noaccess
    Readonly
    Readwrite
  end

  extend ClassMethods

  REGISTERED = Hash(Symbol, Secret).new
  REGISTERED_USES = {} of Nil => Nil
  REGISTERED_LOAD_PATHS = {} of Nil => Nil

  macro register(klass, *args)
p "{{ args.id}}"
    {% for arg in args %}
      {% REGISTERED_USES[arg] = klass %}
    {% end %}
  end

  macro register_class(klass, load_path, *uses)
    {% REGISTERED_LOAD_PATHS[klass] = load_path %}
    register *uses
  end

  register_class "Crypto::Secret::Bidet", "./bidet", :ksk, :key, :data
  register_class "Crypto::Secret::Not", "./not"
  register "Crypto::Secret::Bidet", :ksk, :key, :data

  def self.for(use) : Crypto::Secret
    REGISTERED[use]
  end

  def self.for(use, size)
    for(use).new(size)
  end

  # For debugging.  Leaks the secret
  #
  # Returned String **not** tracked or wiped
  def hexstring : String
    readonly &.hexstring
  end

  # Copies then wipes *data*
  #
  # Prefer this method over `#copy_from`
  def move_from(data : Bytes) : Nil
    copy_from data
  ensure
    data.wipe
  end

  # Copies then wipes *data*
  #
  # Prefer this method over `#copy_from`
  def move_from(data : Crypto::Secret) : Nil
    data.readonly { |dslice| move_from dslice }
  end

  # Copies from *data*
  def copy_from(data : Bytes) : Nil
    readwrite do |slice|
      slice.copy_from data
    end
  end

  # Copies from *data*
  def copy_from(data : Crypto::Secret) : Nil
    data.readonly { |dslice| copy_from dslice }
  end

  # Fills `Secret` with secure random data
  def random : self
    readwrite do |slice|
      Random::Secure.random_bytes slice
    end
    self
  end

  # Zeroes data
  #
  # Secret is unavailable (readonly/readwrite may fail) until reset
  def wipe
    readwrite do |slice|
      wipe_impl slice
    end
  end

  # Secret is wiped after exiting the block
  def wipe
    yield
  ensure
    wipe
  end

  # Wipes data & makes this object available for reuse
  def reset
    wipe
  end

  def finalize
    wipe
  end

  # Timing safe memory compare
  def ==(other : Secret) : Bool
    readonly do |s1|
      other.readonly do |s2|
        Crypto::Subtle.constant_time_compare s1, s2
      end
    end
  end

  # Timing safe memory compare
  def ==(other : Bytes) : Bool
    readonly do |s1|
      Crypto::Subtle.constant_time_compare s1, other
    end
  end

  # Hide internal state to prevent leaking in to logs
  def inspect(io : IO) : Nil
    io << self.class.to_s << "(***SECRET***)"
  end

  def dup
    readonly do |sslice|
      obj = self.class.new sslice.bytesize
      obj.readwrite do |dslice|
        sslice.copy_to dslice
      end
      # TODO: copy state if possible
      obj
    end
  end

  # Marks a region as read & write depending on implementation.
  abstract def readwrite : self
  # Marks a region as read-only depending on implementation.
  abstract def readonly : self
  # Makes a region inaccessible depending on implementation. It cannot be read or written, but the data are preserved.
  abstract def noaccess : self

  # Temporarily marks a region as read & write depending on implementation and yields `Bytes`
  abstract def readwrite(& : Bytes -> U) forall U
  # Temporarily marks a region as readonly depending on implementation and yields `Bytes`
  abstract def readonly(& : Bytes -> U) forall U

  protected abstract def to_slice(& : Bytes -> U) forall U
  abstract def bytesize : Int32

  macro delegate_to_slice(to object)
    def to_slice(& : Bytes -> U) forall U
      yield {{object.id}}.to_slice
    end
  end

  macro delegate_to_bytesize(to object)
    def bytesize : Int32
      {{object.id}}
    end
  end

  protected def wipe_impl(slice : Bytes) : Nil
    slice.wipe
  end
end
