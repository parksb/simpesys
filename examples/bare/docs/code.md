# Code

```rust
let file = File::open("data");
let file = match file {
      Ok(f) => f,
      Err(error) => match error.kind() {
          ErrorKind::NotFound => match File::create("data") {
              Ok(fc) => fc,
              Err(e) => panic!("Failed to create file: {:?}", e),
          },
          other_error => panic!("Failed to open file: {:?}", other_error),
      },
  };
```
