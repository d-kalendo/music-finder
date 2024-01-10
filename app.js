const value = document.querySelector("#value");
const text_input = document.querySelector("#text_input");
const results_list = document.querySelector("#results");
const btn_find = document.querySelector("#btn_find");
const loader = document.querySelector("#loader");
const history_list = document.querySelector("#history");
const notification = document.querySelector("#notification");
const limit = 20;
const API_KEY = '73005fd771db9631c03e18e59792e5a5';
const max_progress = limit * 2 - 1;
let progress = 0;
let history = new Map();

load_history();

// TODO: links to google, last fm, yandex music, spotify

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
    let input = text_input.value.toUpperCase();
    if (input === '') {
        return;
    }

    loader.style.visibility = 'visible';
    set_progress(0);

    if (history.has(input)) {
        set_results(history.get(input));
    } else {
        let results = await get_artists(input);
        let songs = await get_songs(input);
        results = results.concat(songs);
        results.sort((a, b) => b['listeners'] - a['listeners']);
        set_results(results);
        update_history(input, results);
    }

    loader.style.visibility = 'hidden';
    set_progress(0);
}

function update_history(input, results) {
    history.set(input, results);
    let option = document.createElement('option');
    option.value = input;
    history_list.insertBefore(option, history_list.firstChild);
    localStorage.history = JSON.stringify([...history]);
}

function load_history() {
    if (!localStorage.history) return;
    history = new Map(JSON.parse(localStorage.history));
    for (let k of history.keys()) {
        let option = document.createElement('option');
        option.value = k;
        history_list.insertBefore(option, history_list.firstChild);
    }
}

function set_results(results) {
    results_list.innerHTML = '<tr><th></th><th></th><th>Artist</th><th>Track [position] [date]</th><th>Listeners</th><th>Tags</th></tr>';
    for (let [index, result] of results.entries()) {
        let row = results_list.insertRow();
        row.innerHTML = result_to_row(result, index + 1);
    }
}

function result_to_row(result, index) {
    let song_position = result.song_position != null ? `<span class='tag'>${result.song_position}</span>` : '';
    let release_date = result.release_date != null ? `<span class="release-date">${result.release_date}</span>` : '';
    let search_term = result.artist_name + (result.song_position ? (" "+result.song_name) : "");
    let copy_value = result.artist_name + (result.song_position ? (" - "+result.song_name) : "");
    let google_link = "https://google.com/search?q="+search_term;
    let youtube_link = "https://youtube.com/results?search_query="+search_term;
    let yandex_link = "https://music.yandex.ru/search?text="+search_term;
    let spotify_link = "https://open.spotify.com/search/"+search_term;
    let row = `<td>
                        <div style="padding-top: 3px; text-align: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" cursor="pointer" height="16" width="14" viewBox="0 0 448 512" onclick="navigator.clipboard.writeText('${copy_value}');notification.className='show';setTimeout(function () { notification.className=''; }, 3000);"><path d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z"/></svg>
                            <a href="${google_link}" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" height="16" width="15.25" viewBox="0 0 488 512"><path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/></svg></a>
                            <a href="${youtube_link}" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" height="16" width="18" viewBox="0 0 576 512"><path d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6-11.4 42.9-11.4 132.3-11.4 132.3s0 89.4 11.4 132.3c6.3 23.7 24.8 41.5 48.3 47.8C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.2 48.3-47.8 11.4-42.9 11.4-132.3 11.4-132.3s0-89.4-11.4-132.3zm-317.5 213.5V175.2l142.7 81.2-142.7 81.2z"/></svg></a>
                            <a href="${yandex_link}" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" height="16" width="8" viewBox="0 0 256 512"><path d="M153.1 315.8L65.7 512H2l96-209.8c-45.1-22.9-75.2-64.4-75.2-141.1C22.7 53.7 90.8 0 171.7 0H254v512h-55.1V315.8h-45.8zm45.8-269.3h-29.4c-44.4 0-87.4 29.4-87.4 114.6 0 82.3 39.4 108.8 87.4 108.8h29.4V46.5z"/></svg></a>
                            <a href="${spotify_link}" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" height="16" width="15.5" viewBox="0 0 496 512"><path d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8zm100.7 364.9c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4zm26.9-65.6c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm31-76.2c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3z"/></svg></a>
                        </div>
                      </td>
                      <td>${index}</td>
                      <td><a href="${result.artist_url}" target="_blank">${result.artist_name}</a></td>
                      <td><span style="vertical-align: middle">${result.song_name}</span>${song_position}${release_date}</td>
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
        if (song['mbid'] != null && song['mbid'] !== '') {
            let mb_response = await send_request_with_timeout(`https://musicbrainz.org/ws/2/recording/${song['mbid']}?fmt=json`);
            mb_response = JSON.parse(mb_response);
            if ('first-release-date' in mb_response) {
                release = mb_response['first-release-date'];
            }
        } else {
            debugger;
            let google_response = await send_request(`https://google.com/search?q=${song['artist']} ${song['name']}`)
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
        set_progress(progress+1);
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
        set_progress(progress+1);
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

function set_progress(progress_value) {
    progress = progress_value;
    loader.style.width = Math.min(progress/max_progress*100, 100) + "%";
}