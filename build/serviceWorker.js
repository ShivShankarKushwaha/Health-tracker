const CACHE_NAME = "version-1";
const urltoCache = ["./index.html", "./offline.html", '../src/App.js'];
this.addEventListener("install", (e) =>
{
    console.log('installing');
    e.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) =>
        {
            console.log("caches opened");
            // return await cache.addAll(urltoCache);
            try {
                ok = await cache.addAll(urltoCache);
            } catch (err) {
                console.error('sw: cache.addAll');
                for (let i of urltoCache) {
                    try {
                        ok = await cache.add(i);
                    } catch (err) {
                        console.warn('sw: cache.add', i);
                    }
                }
            }

            return ok;
        }),
    );
});
this.addEventListener("fetch", (e) =>
{
    console.log('fetching');
    e.respondWith(
        caches.match(e.request).then((res) =>
        {
            if (res) {
                return res;
            }
            return fetch(e.request)
                .then((response) =>
                {
                    if (!response || response.status !== 200 || response.type !== "basic") {
                        return response;
                    }

                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME).then((cache) =>
                    {
                        cache.put(e.request, responseToCache);
                    });

                    return response;
                })
                .catch(() => caches.match("./offline.html"));
        }),
    );
});

this.addEventListener("activate", (e) =>
{
    console.log('activating');
    const cacheWhiteList = [];
    cacheWhiteList.push(CACHE_NAME);
    e.waitUntil(
        caches.keys().then((cachenames) =>
            Promise.all(
                cachenames.map((cachename) =>
                {
                    if (!cacheWhiteList.includes(cachename)) {
                        return caches.delete(cachename);
                    }
                }),
            ),
        ),
    );
});
