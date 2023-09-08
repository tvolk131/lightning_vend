# This file must be executed from the root directory of the repository.
FROM node:19.0.0
COPY ./frontend ./app/frontend
COPY ./proto ./app/proto
WORKDIR /app
RUN apt-get update && apt-get -y install sudo && sh ./proto/install_linux.sh && cd frontend && npm ci && npm run build-proto && npm run build-prod && cd ..
ENV PORT=80
EXPOSE 80
CMD cd frontend && npm run start-prod
