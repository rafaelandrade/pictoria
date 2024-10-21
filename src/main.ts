const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
const GIPHY_ACCESS_KEY = process.env.GIPHY_ACCESS_KEY
const OPEN_API_ACCESS_KEY = process.env.OPEN_API_ACCESS_KEY
const BASE_URL_PICTORIA_PROXY = process.env.BASE_URL_PICTORIA_PROXY
const API_KEY_PICTORIA_PROXY = process.env.API_KEY_PICTORIA_PROXY

figma.ui.onmessage = async (msg) => {
    if (msg.type === 'search') {
        const { images, totalPages } = await searchUnsplash(msg.searchTerm, msg.page);

        figma.ui.postMessage({ images, totalPages, type: 'unsplash' });
    }

    if (msg.type === 'search-giphy') {
        const { images, totalPages } = await searchGiphy(msg.searchTerm, msg.page)
        figma.ui.postMessage({ images, totalPages, type: 'giphy' })
    }

    if (msg.type === 'search-openai') {
        const { images, totalPages } = await searchImageOpenAI(msg.searchTerm)
        figma.ui.postMessage({ images, totalPages, type: 'openai' })
    }

    if (msg.type === 'insert-images') {
        const imageBytes = await fetchImage(msg.imageUrl);
        const imageHash = figma.createImage(new Uint8Array(imageBytes)).hash;

        const imageNode = figma.createRectangle();
        imageNode.resize(400, 300);
        imageNode.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash }];

        figma.currentPage.appendChild(imageNode);
        figma.viewport.scrollAndZoomIntoView([imageNode]);
    }

    if (msg.type === 'insert-images-openai') {
        const imageBytes: any = await fetchImageOpenAi(msg.imageUrl)

        const imageHash = figma.createImage(new Uint8Array(imageBytes)).hash;
        const imageNode = figma.createRectangle();
        imageNode.resize(400, 300);
        imageNode.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash }];

        figma.currentPage.appendChild(imageNode);
        figma.viewport.scrollAndZoomIntoView([imageNode]);
    }
};

async function searchGiphy(query: string, page: number) {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_ACCESS_KEY}&q=${encodeURIComponent(query)}&limit=9&offset=${(page - 1) * 9}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            const totalPages = Math.ceil(data.pagination.total_count / 9);
            const images = data.data.map((gif: any) => ({
                url: gif.images.original.url, // Original GIF URL
                preview: gif.images.preview_gif.url, // Preview GIF URL
                title: gif.title, // GIF Title (optional)
            }));

            return { images, totalPages };
        } else {
            console.error('Error fetching Giphy images:', data.errors);
            return { images: [], totalPages: 0 };
        }
    } catch (error) {
        console.error('Giphy API Error:', error);
        return { images: [], totalPages: 0 };
    }
}

async function searchUnsplash(query: string, page: number) {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=9&client_id=${UNSPLASH_ACCESS_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            const totalResults = data.total;
            const totalPages = Math.ceil(totalResults / 9); // Assuming per_page is 9
            return { images: data.results, totalPages };
        } else {
            console.error('Error fetching images:', data.errors);
            return { images: [], totalPages: 0 };
        }
    } catch (error) {
        console.error('Unsplash API Error:', error);
        return { images: [], totalPages: 0 };
    }
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchImageOpenAI(query: string, retries = 3) {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPEN_API_ACCESS_KEY}`,
        },
        body: JSON.stringify({
            prompt: query,
            n: 3,
            size: "256x256"
        }),
    };

    const url = `https://api.openai.com/v1/images/generations`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, requestOptions);
            const data = await response.json();

            if (response.ok) {
                return { images: data.data, totalPages: 1 };
            } else if (response.status === 429) {
                console.log(`Rate limit hit. Retrying in ${attempt} second(s)...`);
                await delay(attempt * 1000);  // Exponential backoff
            } else {
                console.error('Error fetching images:', data);
                return { images: [], totalPages: 0 };
            }
        } catch (error) {
            console.error('OpenAI API Error: ', error);
            return { images: [], totalPages: 0 };
        }
    }

    console.error('Exceeded retry limit.');
    return { images: [], totalPages: 0 };
}

async function fetchImage(url: string) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
}

async function fetchImageOpenAi(url: string) {
    const urlProxy = `${BASE_URL_PICTORIA_PROXY}/proxy/image`
    try {
        const response = await fetch(urlProxy, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Ensure the content type is JSON
                'Authorization': `Bearer ${API_KEY_PICTORIA_PROXY}`
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();  // Read binary data directly
        return arrayBuffer;
    } catch (error) {
        console.error('Error fetching image as Base64:', error);
        return null;
    }
}

figma.showUI(__html__, { width: 400, height: 600 });
