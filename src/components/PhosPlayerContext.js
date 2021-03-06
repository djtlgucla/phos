import React, { useReducer } from 'react';

const PhosPlayerContext = React.createContext();

const NOTION_BASE = "https://notion.so"

const initState = {

    // data
    data: {}, // 音乐数据 
    currentPlaySong: {}, // 当前播放的音乐
    currentPlaylist: [], // 不会被存储的当前播放列表
    allPlaylist: [], // 所有的播放列表

    // 下面字段会影响歌曲列表的显示。filter
    playlistName: undefined, // 默认为空，显示全部歌曲
    artistName: undefined, // 默认为空，显示全部歌手的歌曲
    albumName: undefined, // 默认为空，显示全部专辑的歌曲
    filterBy: undefined, // 默认为空，不会过滤歌曲
    showNowPlaylist: false, // 是否显示当前播放列表

    searchWord: undefined, // 默认为空，不会过滤歌曲
    searchType: 'so', // 默认为常规搜索 [so,pl,ar,al] 歌曲（常规）/歌单/艺人/专辑

    // player
    url: '', // 
    volume: 1, // 0-1 音量 
    muted: false, // 
    playing: false, // 是否播放
    isReady: false, // 当前歌曲是否加载完毕，可以播放
    isBufferEnd: false, //当前播放的歌曲缓存是否结束

    shuffle: false,
    repeat: 'none', // ['none','one','list'] 不循环 | 单曲循环 | 列表循环

    // player state
    phosColor: "#38d4c9",
    playingState: {},
    openSettings: false, // 是否打开配置
    loading: true,

    // player style
    background: localStorage.getItem("style.background"),
    color: localStorage.getItem("style.color"),
    opacity: localStorage.getItem("style.opacity"),

    // msg
    msg: '',
    msgOpen: false
}



const getPlaylist = (songs) => {
    return songs ? songs.schema.playlist.options.map(o => o.value) : []
}

// reducer

function getSongSourceFileAndArtists(song) {
    let songSourceFile
    switch (song.source) {
        case "file":
            songSourceFile = `${NOTION_BASE}/signed/${encodeURIComponent(song.file[0]).replace("s3.us-west", "s3-us-west")}`
            break
        case "163":
            songSourceFile = song.file[0] //song.file.find(s => s.startsWith("https://music.163.com")) || `https://music.163.com/song/media/outer/url?id=${song.id_163}.mp3`
            break
        case "ytb":
            songSourceFile = song.file[0]
            break
        default:
            songSourceFile = undefined
    }

    let artists = `${song.artist && song.artist.length ? song.artist.filter(i => !!i).map(a => a.name).join(",") : '未知'}`

    return [songSourceFile, artists]
}

function phosReducer(state, action) {
    const { currentPlaySong, currentPlaylist, showNowPlaylist } = state
    switch (action.type) {
        case 'closeMsg':
            return {
                ...state,
                msg: '',
                msgOpen: false
            }
        case 'showMsg':
            return {
                ...state,
                msg: action.payload.msg,
                msgOpen: true
            }
        case 'loadData':
            return {
                ...state,
                data: action.payload.data,
                allPlaylist: getPlaylist(action.payload.data.songs)
            }
        case 'play':
            if (state.currentPlaySong.title) {
                return {
                    ...state,
                    playing: !state.playing
                }
            } else {
                return state
            }
        case 'loading':
            return {
                ...state,
                loading: !state.loading
            }
        case 'addOneSongToCurrentPlaylist':
            if (action.payload.song.file || action.payload.song.id_163) {
                let _currentPlaylist = [...currentPlaylist, action.payload.song]
                return {
                    ...state,
                    currentPlaylist: _currentPlaylist
                }
            } else {
                return state
            }
        case 'playOneSong':
            if (action.payload.song.file || action.payload.song.id_163) {
                // 当前播放列表名称
                const { playlistName } = state
                let _currentPlaylist = showNowPlaylist ? currentPlaylist : [...currentPlaylist, action.payload.song]
                let songsCanPlay = state.data.songs.rows.filter(song => !!song.file || !!song.id_163)
                // if (!playlistName) {
                //     // 全部歌曲列表 > 当前播放列表
                //     _currentPlaylist = songsCanPlay
                // } else {
                //     // 点击的歌单 > 当前播放列表
                //     _currentPlaylist = songsCanPlay.filter(song => song.playlist && song.playlist.includes(playlistName))
                // }


                let [songSourceFile, artists] = getSongSourceFileAndArtists(action.payload.song)
                document.title = `${action.payload.song.title} - ${artists}`

                return {
                    ...state,
                    currentPlaySong: action.payload.song,
                    url: songSourceFile,
                    isReady: false,
                    playing: true,
                    isBufferEnd: false,
                    // currentPlaylist: _currentPlaylist
                }
            } else {
                return state
            }

        case 'changeVolume':
            return {
                ...state,
                volume: action.payload.volume
            }
        case 'updatePlayingState':
            return {
                ...state,
                playingState: action.payload.playingState
            }
        case 'setVolume':
            return {
                ...state,
                volume: action.payload.volume
            }
        case 'setPlaylistName':
            return {
                ...state,
                playlistName: action.payload.playlistName,
                filterBy: 'playlistName',
                showNowPlaylist: false
            }
        case 'setArtistName':
            return {
                ...state,
                artistName: action.payload.artistName,
                filterBy: 'artistName',
                showNowPlaylist: false
            }
        case 'setAlbumName':
            return {
                ...state,
                albumName: action.payload.albumName,
                filterBy: 'albumName',
                showNowPlaylist: false
            }
        case 'set':
            // 更新任意状态
            return {
                ...state,
                ...action.payload
            }
        case 'setPlayerConfig':
            // 配置基础 player 参数
            return {
                ...state,
                [action.payload.name]: action.payload.value
            }
        case 'setRepeat':
            let repeatStateList = ['none', 'list', 'one']
            let newRepeatIndex = (repeatStateList.indexOf(state.repeat) + 1) % repeatStateList.length
            let repeat = repeatStateList[newRepeatIndex]
            return {
                ...state,
                repeat
            }
        case 'prev':
            //上一曲
            if (currentPlaySong.title && currentPlaylist && currentPlaylist.length) {
                let prevSongIndex
                if (currentPlaylist.findIndex(i => i.title === currentPlaySong.title) === 0) {
                    prevSongIndex = currentPlaylist.length - 1
                } else {
                    prevSongIndex = (currentPlaylist.findIndex(i => i.title === currentPlaySong.title) - 1) % currentPlaylist.length
                }
                let prevSong = currentPlaylist[prevSongIndex]
                let [songSourceFile, artists] = getSongSourceFileAndArtists(prevSong)
                document.title = `${prevSong.title} - ${artists}`
                return {
                    ...state,
                    currentPlaySong: prevSong,
                    url: songSourceFile,
                }
            } else {
                return state
            }
        case 'next':
            //下一曲
            if (currentPlaySong.title && currentPlaylist && currentPlaylist.length) {
                let nextSongIndex = (currentPlaylist.findIndex(s => s.title === currentPlaySong.title) + 1) % currentPlaylist.length
                let nextSong = currentPlaylist[nextSongIndex]
                let [songSourceFile, artists] = getSongSourceFileAndArtists(nextSong)
                document.title = `${nextSong.title} - ${artists}`

                return {
                    ...state,
                    currentPlaySong: nextSong,
                    url: songSourceFile,
                }
            } else {
                return state
            }
    }
}


const PhosPlayerProvider = (props) => {
    const [state, dispatch] = useReducer(phosReducer, initState);

    return (
        <PhosPlayerContext.Provider value={{ state, dispatch }}>
            {props.children}
        </PhosPlayerContext.Provider>
    );
}

export { PhosPlayerContext, PhosPlayerProvider };