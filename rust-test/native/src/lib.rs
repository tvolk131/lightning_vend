use neon::prelude::*;
use std::sync::Mutex;
use lazy_static::lazy_static;

lazy_static! {
    static ref COUNTER: Mutex<i32> = Mutex::from(0);
}

fn hello(mut cx: FunctionContext) -> JsResult<JsString> {
    let mut counter = COUNTER.lock().unwrap();
    *counter += 1;
    Ok(cx.string(format!("hello node for the {} time", counter)))
}

register_module!(mut cx, {
    cx.export_function("hello", hello)
});

// use ffi_support::implement_into_ffi_by_protobuf;
// use prost::Message;
// use mongodb::Client;

// mod proto;

// use proto::lightning_vend::DeviceData;

// implement_into_ffi_by_protobuf!(DeviceData);

// static mut ...;

// #[no_mangle]
// pub extern "C" fn create_new_device(encoded_device_data: ffi_support::ByteBuffer) -> ffi_support::ByteBuffer {
//     let device_data = match DeviceData::decode(encoded_device_data.as_slice()) {
//         Ok(mut device_data) => {
//             device_data.display_name = String::from("Hello from Rust!");
//             device_data
//         },
//         Err(_err) => {
//             DeviceData::default()
//         }
//     };

//     let mut buf = ffi_support::ByteBuffer::default();
//     device_data.encode(&mut buf.as_mut_slice()).unwrap();
//     buf
// }
