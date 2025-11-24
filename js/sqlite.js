//自定义主键id
if(localStorage.index==undefined){
    localStorage.index=0;
}
var index=localStorage.index;

// IndexedDB数据库配置
var DB_NAME = "playerDB";
var DB_VERSION = 1;
var STORE_NAME = "players";
var db;

// 打开数据库
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = function(event) {
            console.error("数据库打开失败:", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            console.log("数据库打开成功");
            resolve(db);
        };

        request.onupgradeneeded = function(event) {
            db = event.target.result;

            // 创建对象存储
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, {
                    keyPath: "p_id",
                    autoIncrement: true
                });
                objectStore.createIndex("p_name", "p_name", { unique: false });
                objectStore.createIndex("p_score", "p_score", { unique: false });
            }
        };
    });
}
// 清空数据
function clearData() {
    return new Promise((resolve, reject) => {
        initDatabase().then(() => {
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = function() {
                localStorage.index = 0;
                resolve();
            };

            request.onerror = function(event) {
                reject(event.target.error);
            };
        }).catch(reject);
    });
}

// 初始化数据库
initDatabase().then(() => {
    console.log("数据库初始化完成");
}).catch(console.error);

/**
 * 添加玩家信息
 * @returns {boolean}
 */
if(localStorage.name==undefined){
    localStorage.name="";
}
var isExistFlag=0;
var isSubmit=0;
function pushInfo(){
    if(isSubmit==0){
        var name=$("playerName").value.trim();
        if(name.trim()==""){
            return;
        }
        var score=eval(gameTime*7+imgColorNum*10+imgNum*100);

        initDatabase().then(() => {
            // 检查玩家是否存在
            checkPlayerExists(name.trim()).then(exists => {
                const transaction = db.transaction([STORE_NAME], "readwrite");
                const store = transaction.objectStore(STORE_NAME);

                if (exists) {
                    // 更新现有玩家数据
                    const index = store.index("p_name");
                    const getRequest = index.get(name.trim());

                    getRequest.onsuccess = function() {
                        const player = getRequest.result;
                        if (player) {
                            player.p_score = score;
                            player.p_golds = player.p_golds + imgNum;

                            const updateRequest = store.put(player);
                            updateRequest.onsuccess = function() {
                                notify("亲，数据提交成功！");
                            };
                        }
                    };
                } else {
                    // 添加新玩家
                    index++;
                    localStorage.index = index;
                    const newPlayer = {
                        p_id: Number(index),
                        p_name: name.trim(),
                        p_score: score,
                        p_golds: imgNum
                    };

                    const addRequest = store.add(newPlayer);
                    addRequest.onsuccess = function() {
                        notify("亲，数据提交成功！");
                    };
                }
            });
        }).catch(console.error);

        isSubmit++;
        localStorage.name=name;
    } else{
        return false;
    }
}

// 检查玩家是否存在
function checkPlayerExists(name) {
    return new Promise((resolve) => {
        initDatabase().then(() => {
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index("p_name");
            const request = index.get(name);

            request.onsuccess = function() {
                resolve(!!request.result);
            };

            request.onerror = function() {
                resolve(false);
            };
        }).catch(() => resolve(false));
    });
}

/**
 * 显示高分榜
 */
function showData(flag){
    initDatabase().then(() => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("p_score");
        const request = index.openCursor(null, "prev");

        var content = "<table style='width: 100%'>";
        var count = 0;

        request.onsuccess = function(event) {
            const cursor = event.target.result;

            if (cursor && count < 10) {
                content += "<tr><td style='width: 50%'>" + cursor.value.p_name + "</td><td style='width: 50%'>" + cursor.value.p_score + "</td></tr>";
                count++;
                cursor.continue();
            } else {
                content += "</table>";
                flag.innerHTML = content;
            }
        };

        request.onerror = function() {
            flag.innerHTML = "<table style='width: 100%'><tr><td>加载失败</td></tr></table>";
        };
    }).catch(function() {
        flag.innerHTML = "<table style='width: 100%'><tr><td>数据库初始化失败</td></tr></table>";
    });
}
/**
 * 获取最高分
 */
var bestScore=0;
function getBestScore(){
    initDatabase().then(() => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("p_score");
        const request = index.openCursor(null, "prev");

        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                bestScore = cursor.value.p_score;
            } else {
                bestScore = 0;
            }
        };

        request.onerror = function() {
            bestScore = 0;
        };
    }).catch(function() {
        bestScore = 0;
    });
}

/**
 * 获取玩家总金币数
 */
var playerGolds=0;
function getPlayerGolds(){
    initDatabase().then(() => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("p_name");
        const request = index.get(localStorage.name);

        request.onsuccess = function() {
            if (request.result) {
                playerGolds = request.result.p_golds;
            } else {
                playerGolds = 0;
            }
        };

        request.onerror = function() {
            playerGolds = 0;
        };
    }).catch(function() {
        playerGolds = 0;
    });
}


/**
 * 系统通知
 */
function notify(content) {
    if (window.webkitNotifications) {
        if (window.webkitNotifications.checkPermission() == 0) {
            var notification_test = window.webkitNotifications.createNotification("../img/favorite.png", '颜色运行',content);
            notification_test.display = function() {}
            notification_test.onerror = function() {}
            notification_test.onclose = function() {}
            notification_test.onshow  = function() { setTimeout('notification_test.cancel()', 5000); }
            notification_test.onclick = function() {this.cancel();}
            notification_test.replaceId = 'Meteoric';
            notification_test.show();
        } else {
            window.webkitNotifications.requestPermission(notify);
        }
    }
}


