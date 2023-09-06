# Remove old proto_out folder if it exists, otherwise ignore error.
rm -r -f proto_out
# Create new proto_out folder (and ignore error if it already exists).
mkdir -p ./proto_out
# Generate proto files.
cd ../proto
protoc \
  --plugin=../frontend/node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_opt=forceLong=long \
  --ts_proto_opt=useMapType=true \
  --ts_proto_out=../frontend/proto_out \
  ./google/api/field_behavior.proto \
  ./lightning_vend/device_service.proto \
  ./lightning_vend/model.proto \
  ./lightning_vend/user_service.proto \
  ./lightning_vend/wallet_service.proto \
  ./lnd/lnrpc/lightning.proto google/protobuf/any.proto
cd ../frontend
