FROM node:19.0.0
COPY ./ ./app
WORKDIR /app
RUN apt-get update && apt-get -y install sudo && sh ../proto/install_linux.sh && npm ci && npm run build-proto && npm run build-prod
ENV PORT=80
EXPOSE 80
CMD npm run start-prod