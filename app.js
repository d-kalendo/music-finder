const value = document.querySelector("#value");
const text_input = document.querySelector("#text_input");
const results_list = document.querySelector("#results");
const btn_find = document.querySelector("#btn_find");
const loader = document.querySelector("#loader")
const cb_search_release = document.querySelector("#cb_search_release")
const limit = 20;
const API_KEY = '73005fd771db9631c03e18e59792e5a5';

// console.log(fuzzball.ratio("fuzz", "fuzzy"));

btn_find.addEventListener("click", function (e) {
    find();
});

text_input.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        btn_find.click();
    }
});

function numberWithCommas(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function find() {
    let input = text_input.value;
    if (input === '') {
        return;
    }

    loader.style.visibility = 'visible';

    let results = await get_artists(input);
    let songs = await get_songs(input);
    results = results.concat(songs);


    results_list.innerHTML = '<tr><th></th><th>Artist</th><th>Track [position]</th><th>Listeners</th><th>Tags</th></tr>';
    results.sort((a, b) => b['listeners'] - a['listeners']);
    for (let [index, result] of results.entries()) {
        let row = results_list.insertRow();
        row.innerHTML = result_to_row(result, index + 1);
    }

    loader.style.visibility = 'hidden';
}

function result_to_row(result, index) {
    let song_position = result.song_position != null ? `<span class='tag'>${result.song_position}</span>` : '';
    let release_date = result.release_date != null ? `<span class="release-date">${result.release_date}</span>` : '';
    let row = `<td>${index}</td>
                      <td><a href="${result.artist_url}">${result.artist_name}</a></td>
                      <td>${release_date}<span style="vertical-align: middle">${result.song_name}</span>${song_position}</td>
                      <td>${numberWithCommas(result.listeners)}</td>
                      <td>`;
    for (let tag of result.tags) {
        row += `<span class='tag'>${tag}</span>`;
    }
    return row + '</td>';
}

async function get_songs(input) {
    input = encodeURIComponent(input);
    let response = await send_request(`https://ws.audioscrobbler.com/2.0/?method=track.search&track=${input}&api_key=${API_KEY}&format=json&limit=${limit}`);
    let data = JSON.parse(response);
    let result = [];
    for (let song of data['results']['trackmatches']['track']) {
        let artist_info = await get_artist_info(song['artist']);
        let tags = artist_info['tags']['tag'].map(t => t['name']);
        let top_songs = await get_artist_top_songs(song['artist']);
        top_songs = top_songs['toptracks']['track']
        top_songs.sort((a, b) => b['listeners'] - a['listeners'])
        let relative_listeners = Math.round(song['listeners'] / top_songs[0]['listeners'] * artist_info['stats']['listeners']);
        let song_position = top_songs.findIndex(t => t['name'] === song['name'])
        let release = null;
        if (cb_search_release.checked && song['mbid'] != null && song['mbid'] !== '') {
            let mb_response = await send_request_with_timeout(`https://musicbrainz.org/ws/2/recording/${song['mbid']}?fmt=json`);
            mb_response = JSON.parse(mb_response);
            if ('first-release-date' in mb_response) {
                release = mb_response['first-release-date'];
            }
        }
        result.push({
            artist_name: song['artist'],
            song_name: song['name'],
            listeners: relative_listeners,
            tags: tags,
            artist_url: artist_info['url'],
            song_position: song_position !== -1 ? song_position + 1 : '50+',
            release_date: release
        });
    }
    return result;
}

async function get_artists(input) {
    input = encodeURIComponent(input);
    let response = await send_request(`https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${input}&api_key=${API_KEY}&format=json&limit=${limit}`);
    let data = JSON.parse(response);
    let result = [];
    for (let artist of data['results']['artistmatches']['artist']) {
        let tags = await get_artist_tags(artist['name']);
        result.push({
            artist_name: artist['name'],
            song_name: '---//---',
            listeners: artist['listeners'],
            tags: tags,
            artist_url: artist['url']
        });
    }
    return result;
}

async function get_artist_info(artist) {
    artist = encodeURIComponent(artist);
    let response = await send_request(`https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${artist}&api_key=${API_KEY}&format=json`);
    let data = JSON.parse(response);
    return data['artist']
}

async function get_artist_top_songs(artist) {
    artist = encodeURIComponent(artist);
    let response = await send_request(`https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${artist}&api_key=${API_KEY}&format=json`);
    let data = JSON.parse(response);
    return data;
}

async function get_artist_tags(artist) {
    artist = encodeURIComponent(artist);
    let response = await send_request(`https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${artist}&api_key=${API_KEY}&format=json`);
    let data = JSON.parse(response);
    if ('error' in data) {
        return [];
    }
    return data['artist']['tags']['tag'].map(t => t['name']);
}

async function send_request(url) {
    const response = await fetch(url);
    return response.text();
}

async function send_request_with_timeout(url, timeout = 1000) {
    return new Promise((resolve) => setTimeout(async () => {
        let response = await fetch(url);
        resolve(response.text());
    }, timeout));
}