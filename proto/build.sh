mkdir -p ./proto_out
cd proto
protoc --plugin=../node_modules/.bin/protoc-gen-ts_proto --ts_proto_opt=forceLong=string --ts_proto_out=../proto_out ./lightning_vend/model.proto ./lnd/lnrpc/lightning.proto
cd ..
