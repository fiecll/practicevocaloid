import { Player, stringToDataUrl } from "textalive-app-api";


class Main
{
    constructor ()
    {
        var canMng = new CanvasManager();
        this._canMng = canMng;
 
        this._initPlayer();

        window.addEventListener("resize", () => this._resize());
        this._update();
    }
    // プレイヤー初期化
    _initPlayer ()
    {
        var player = new Player({
            // トークンは https://developer.textalive.jp/profile で取得したものを使う
            app: { token: "6OdzAkUG3Vc5B9nJ" },
            mediaElement: document.querySelector("#media")
        });
        
        player.addListener({
            onAppReady: (app) => this._onAppReady(app),
            onVideoReady: (v) => this._onVideoReady(v),
            onTimeUpdate: (pos) => this._onTimeUpdate(pos)
        });
        this._player = player;
    }
    // アプリ準備完了
    _onAppReady (app)
    {
        if (! app.songUrl)
        {
            // ラテルネ / その心に灯る色は
            this._player.createFromSongUrl("https://piapro.jp/t/hZ35/20240130103028", {
                video: {
                  // 音楽地図訂正履歴
                   beatId: 4592293,
                   chordId: 2727635,
                   repetitiveSegmentId: 2824326,
                   // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FhZ35%2F20240130103028
                   lyricId: 59415,
                   lyricDiffId: 13962
                 },
               });
        }

        // 画面クリックで再生／一時停止
        document.getElementById("view").addEventListener("click", () => function(p){ 
            if (p.isPlaying) p.requestPause();
            else             p.requestPlay();
        }(this._player));
    }
    // ビデオ準備完了
    _onVideoReady (v)
    {
        // 歌詞のセットアップ
        var lyrics = [];
        if (v.firstChar)
        {
            var c = v.firstChar;
            while (c)
            {
                lyrics.push(new Lyric(c));
                c = c.next;
            }
        }
        this._canMng.setLyrics(lyrics);
    }
    // 再生位置アップデート
    _onTimeUpdate (position)
    {
        this._position   = position;
        this._updateTime = Date.now();
        this._canMng.update(position);
    }

    _update ()
    {
        if (this._player.isPlaying && 0 <= this._updateTime && 0 <= this._position)
        {
            var t = (Date.now() - this._updateTime) + this._position;
            this._canMng.update(t);
        }
        window.requestAnimationFrame(() => this._update());
    }
    _resize ()
    {
        this._canMng.resize();
    }
}

class Lyric
{
    constructor (data)
    {
        this.text      = data.text;      // 歌詞文字
        this.startTime = data.startTime; // 開始タイム [ms]
        this.endTime   = data.endTime;   // 終了タイム [ms]
        this.duration  = data.duration;  // 開始から終了迄の時間 [ms]
        
        this.x = 0; // グリッドの座標 x
        this.y = 0; // グリッドの座標 y
        this.isDraw = false; // 描画するかどうか
    }
}

class CanvasManager
{
    constructor ()
    {
        // 現在のスクロール位置（画面右上基準）
        this._px = 0; this._py = 0;
        // マウス位置（中心が 0, -1 ~ 1 の範囲に正規化された値）
        this._rx = 0; this._ry = 0;

        // １グリッドの大きさ [px]
        this._space    = 160;
        // スクロール速度
        this._speed    = 1500;
        // 楽曲の再生位置
        this._position = 0;
        // マウスが画面上にあるかどうか（画面外の場合 false）
        this._isOver   = false;
        
        // キャンバス生成（描画エリア）
        this._can = document.createElement("canvas");
        this._ctx = this._can.getContext("2d");
        document.getElementById("view").append(this._can);
        
        // マウス（タッチ）イベント
        document.addEventListener("mousemove",  (e) => this._move(e));
        document.addEventListener("mouseleave", (e) => this._leave(e));
        if ("ontouchstart" in window)
        {
            // グリッドの大きさ／スクロール速度半分
            this._space *= 0.5;
            this._speed *= 0.5;
            document.addEventListener("touchmove",  (e) => this._move(e));
            document.addEventListener("touchend", (e) => this._leave(e));
        }

        this.resize();
    }

    // 歌詞の更新
    setLyrics (lyrics)
    {
        this._lyrics = lyrics;
    }
    // 再生位置アップデート
    update (position)
    {
        // マウスが画面外の時、オートモード
        if (! this._isOver)
        {
            this._rx = Math.sin(position / 1234 + 0.123) * 0.3 + 0.2;
            this._ry = Math.cos(position / 1011 + 0.111) * 0.5;
            this._mouseX = this._stw * (this._rx + 1) / 2;
            this._mouseY = this._sth * (this._ry + 1) / 2;
        }
        // マウス位置に応じてスクロール位置の更新
        var delta = (position - this._position) / 1000;
        this._px += - this._rx * delta * this._speed;
        this._py += - this._ry * delta * this._speed;

    
        this._position = position;
    }
    // リサイズ
    resize ()
    {
        this._can.width  = this._stw = document.documentElement.clientWidth;
        this._can.height = this._sth = document.documentElement.clientHeight;
    }
    
    // "mousemove" / "touchmove"
    _move (e)
    {
        var mx = 0;
        var my = 0;

        if (e.touches)
        {
            mx = e.touches[0].clientX;
            my = e.touches[0].clientY;
        }
        else
        {
            mx = e.clientX;
            my = e.clientY;
        }
        this._mouseX = mx;
        this._mouseY = my;

        this._rx = (mx / this._stw) * 2 - 1;
        this._ry = (my / this._sth) * 2 - 1;

        this._isOver = true;
    }
    // "mouseleave" / "touchend"
    _leave (e)
    {
        this._isOver = false;
    }

    
    
    _easeOutBack (x) { return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); }
}

new Main()