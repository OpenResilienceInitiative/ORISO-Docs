# Operator builds this from the exact Node digest in toolchain.lock.json.
ARG NODE_IMAGE
FROM ${NODE_IMAGE}
USER root
RUN apt-get update && apt-get install -y --no-install-recommends python3 git && rm -rf /var/lib/apt/lists/*
# This container mounts only the approved public release tree, read-only.
COPY bundle/public-repositories.json /tmp/public-repositories.json
RUN python3 -c 'import json,subprocess; [subprocess.run(["git","config","--system","--add","safe.directory","/sources/"+r],check=True) for r in json.load(open("/tmp/public-repositories.json"))["repositories"]]' && rm /tmp/public-repositories.json
USER node
