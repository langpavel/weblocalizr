#!/bin/bash

# Bash shell script for generating self-signed certs. Run this in a folder, as it
# generates a few files. Large portions of this script were taken from the
# following artcile:
#
# http://usrportage.de/archives/919-Batch-generating-SSL-certificates.html
#
# Additional alterations by: Brad Landers

# Script accepts a single optional argument, the fqdn for the cert
DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
  DOMAIN="localhost"
fi

echo "Generating cert for domain $DOMAIN"

fail_if_error() {
  [ $1 != 0 ] && {
    unset PASSPHRASE
    exit 10
  }
}

# Generate a passphrase
export PASSPHRASE=$(head -c 50 /dev/urandom | base64 | head -c 50; echo)


echo "Password: $PASSPHRASE"
echo "Set this as environment variable SSL_PASS or edit server.js file"


# Certificate details; replace items in angle brackets with your own info
subj="
C=CZ
ST=CZ
O=IPEX
localityName=Brno
commonName=$DOMAIN
organizationalUnitName=IPEX
emailAddress=security@ipex.cz
"

# Generate the server private key
openssl genrsa -des3 -out $DOMAIN.key -passout env:PASSPHRASE 4096
fail_if_error $?

# Generate the CSR
openssl req \
    -new \
    -batch \
    -subj "$(echo -n "$subj" | tr "\n" "/")" \
    -key $DOMAIN.key \
    -out $DOMAIN.csr \
    -passin env:PASSPHRASE
fail_if_error $?
cp $DOMAIN.key $DOMAIN.key.org
fail_if_error $?

# Strip the password so we don't have to type it every time we restart Apache
openssl rsa -in $DOMAIN.key.org -out $DOMAIN.key -passin env:PASSPHRASE
fail_if_error $?

# Generate the cert (good for 10 years)
openssl x509 -req -days 3650 -in $DOMAIN.csr -signkey $DOMAIN.key -out $DOMAIN.crt
fail_if_error $?
