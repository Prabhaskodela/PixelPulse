const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const resultsGrid = document.getElementById("results-grid");
const statusMessage = document.getElementById("status-message");
const resultsTitle = document.getElementById("results-title");
const resultsKicker = document.getElementById("results-kicker");
const resultCount = document.getElementById("result-count");

const commonsApi = "https://commons.wikimedia.org/w/api.php";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = input.value.trim();

  if (!query) {
    input.focus();
    return;
  }

  await searchImages(query);
});

document.querySelectorAll("[data-query]").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.query;
    form.requestSubmit();
  });
});

async function searchImages(query) {
  resultsGrid.replaceChildren();
  resultsTitle.textContent = `Searching for “${query}”`;
  resultsKicker.textContent = "FINDING YOUR NEXT SPARK";
  resultCount.textContent = "";
  statusMessage.textContent = "Looking through Wikimedia Commons…";
  statusMessage.className = "status-message loading";

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "24",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "720",
    format: "json",
    origin: "*",
  });

  try {
    const response = await fetch(`${commonsApi}?${params.toString()}&gsrsearch=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`Image search failed (${response.status}).`);
    }

    const data = await response.json();
    const pages = Object.values(data.query?.pages ?? {});
    const images = pages.filter((page) => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url);

    if (images.length === 0) {
      statusMessage.textContent = `No images found for “${query}”. Try another search.`;
      statusMessage.className = "status-message";
      resultsTitle.textContent = "No images this time";
      return;
    }

    images.forEach((page) => resultsGrid.append(createImageCard(page)));
    resultsTitle.textContent = `A little more ${query}`;
    resultCount.textContent = `${images.length} ${images.length === 1 ? "image" : "images"}`;
    statusMessage.textContent = "Select an image to see it in full on Wikimedia Commons.";
    statusMessage.className = "status-message";
  } catch (error) {
    console.error(error);
    resultsTitle.textContent = "We hit a small snag";
    statusMessage.textContent = "Image search is unavailable right now. Please try again in a moment.";
    statusMessage.className = "status-message";
  }
}

function createImageCard(page) {
  const info = page.imageinfo[0];
  const imageUrl = info.thumburl || info.url;
  const fileUrl = info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`;
  const title = page.title.replace(/^File:/, "").replace(/\.[^.]+$/, "").replaceAll("_", " ");
  const artist = info.extmetadata?.Artist?.value;
  const credit = artist ? stripHtml(artist).slice(0, 90) : "Wikimedia Commons contributor";

  const card = document.createElement("article");
  card.className = "image-card";
  const link = document.createElement("a");
  link.className = "image-link";
  link.href = fileUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `Open ${title} on Wikimedia Commons`);

  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = title;
  image.loading = "lazy";
  image.addEventListener("load", () => image.classList.add("loaded"), { once: true });
  link.append(image);

  const meta = document.createElement("div");
  meta.className = "image-meta";
  const caption = document.createElement("p");
  caption.className = "image-title";
  caption.textContent = title;
  const attribution = document.createElement("p");
  attribution.className = "image-credit";
  attribution.textContent = `By ${credit}`;
  meta.append(caption, attribution);
  card.append(link, meta);
  return card;
}

function stripHtml(value) {
  const parser = new DOMParser();
  return parser.parseFromString(value, "text/html").body.textContent.trim();
}

