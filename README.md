# BoltGUI

## Getting Started

### Installing

To start using BoltGUI, install Go and run `go get`:

```sh
$ go get github.com/Hek1t/BoltGUI
```

This will install the `BoltGUI` command line utility into
your `$GOBIN` path.

### Usage

```sh
$ BoltGUI -path ~/bolt.db -port 8080
```

or just run 

```sh
$ BoltGUI
```

and enter path to bolt file in stdin. Server will started on 8080 port

### TODO

- [ ] Add support for nested buckets
- [ ] Search over bucket
- [ ] Load entries while scrolling
- [ ] File picker
- [ ] More pleasant interface
