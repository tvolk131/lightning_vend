sudo apt-get update
sudo apt-get install -y protobuf-compiler
protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto --ts_proto_opt=forceLong=string --ts_proto_out=. ./proto/lightning_vend/model.proto ./proto/lnd/lnrpc/lightning.proto