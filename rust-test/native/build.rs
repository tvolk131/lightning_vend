extern crate neon_build;

use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    neon_build::setup();

    if let Err(err) = fs::create_dir("./src/proto") {
        // Discard the error if it is because the folder already exists.
        if err.kind() != std::io::ErrorKind::AlreadyExists {
            return Err(Box::from(err));
        }
    }
    tonic_build::configure()
        .out_dir("./src/proto")
        .compile_well_known_types(true)
        .compile(
            &[
                "../../proto/lightning_vend/model.proto",
                "../../proto/lnd/lnrpc/lightning.proto",
            ],
            &["../../proto"],
        )?;
    Ok(())
}
