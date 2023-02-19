use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    if let Err(err) = fs::create_dir("./src/proto") {
        // Discard the error if it is because the folder already exists.
        if err.kind() != std::io::ErrorKind::AlreadyExists {
            return Err(Box::from(err));
        }
    }
    tonic_build::configure()
        .out_dir("./src/proto")
        .compile_well_known_types(true)
        .type_attribute(".lnrpc", "#[derive(serde::Serialize, serde::Deserialize)]")
        .type_attribute(".lnrpc", "#[serde(rename_all = \"camelCase\")]")
        .compile(
            &[
                "../proto/lightning_vend/model.proto",
                "../proto/lightning_vend/service.proto",
                "../proto/lnrpc/lightning.proto",
            ],
            &["../proto"],
        )?;
    Ok(())
}
