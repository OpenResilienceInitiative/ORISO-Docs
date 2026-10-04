# Existing Docs address compatibility

The catalog generates `legacy-redirects.conf` during content sync. It maps old URLs, including the reported `.md` Keycloak URL, to the same German article. Include the map in nginx's `http` context. In the **existing docs.oriso.org server** put the following before the static-file location:

```nginx
if ($oriso_docs_redirect != "") {
    return 301 $oriso_docs_redirect$is_args$args;
}
```

Validate with `nginx -t`, then apply through the normal operator process. Do not install this host-wide rule on Understand; its overview, graph and legal locations remain independent. The static export also provides compatibility pages for previews, but the exact old `.md` request requires this server redirect before file lookup. Query arguments are retained; the browser retains the section fragment.

After deployment, open the reported URL and Local Development's link in the browser. Record the response status, final German destination and article content. A generated config alone is not proof of the running nginx configuration.
