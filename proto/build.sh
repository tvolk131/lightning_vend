# Remove old proto_out folder if it exists, otherwise ignore error.
rm -r -f proto_out
# Create new proto_out folder (and ignore error if it already exists).
mkdir -p ./proto_out
# Generate proto files.
cd proto
protoc --plugin=../node_modules/.bin/protoc-gen-ts_proto --ts_proto_opt=forceLong=string --ts_proto_out=../proto_out ./lightning_vend/model.proto ./lnd/lnrpc/lightning.proto
cd ..
