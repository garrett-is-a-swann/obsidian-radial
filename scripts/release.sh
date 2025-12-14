#!/usr/bin/env bash
set -x
header="$(jq -r .name package.json):"
version=$(jq -r .version package.json)
if [ -z "$tag" ]; then
    tag="$version"
fi

SED_SEMVER_REGEX='\(\(\.\?[0-9]\+\)\{3\}\)' # Technially matches .0.0.0 - user be warned :)
SED_GET_SEMVER="s/$SED_SEMVER_REGEX.*/\1/p"
semver=$(echo "$version" | sed -n "$SED_GET_SEMVER")
title="v$version"
prever=$(echo "$version" | sed -n "s/$SED_SEMVER_REGEX\.\([0-9]\+[a|b]\)/\3/p")

notes="# $header v$semver"

flags=""

if [[ "$prever" == *a ]]; then
    notes="$notes - alpha:$prever"
    flags="$flags --prerelease"
fi
if [[ "$prever" == *b ]]; then
    notes="$notes - beta:$(echo $prever | sed -n 's/\([0-9]\+\).*/\1/p')"
    flags="$flags --prerelease"
fi

gh release create "$tag" --title="$title" --notes="$notes" $flags \
    main.js manifest.json styles.css
