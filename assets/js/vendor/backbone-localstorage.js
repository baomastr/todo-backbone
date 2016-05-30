// Простой модуль для замены Backbone.sync, основанный на localStorage. Модели отдают GUID, и сохраняются в объект JSON. Вот как все просто.


// Генерация четырех случайных шестнадцатеричных чисел.

    function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// Генерация псевдо-GUID путем объединения случайных шестнадцатеричных чисел.

    function guid() {
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

// Наше хранилище Store представляет собой единый объект JS в localStorage.

    var Store = function(name) {
    this.name = name;
    var store = localStorage.getItem(this.name);
    this.data = (store && JSON.parse(store)) || {};
};

_.extend(Store.prototype, {

// Сохраняет текущее состояние хранилища Store в localStorage.

    save: function() {
    localStorage.setItem(this.name, JSON.stringify(this.data));
},

// Добавляет в модель уникальный идентификатор GUID, если у модели его еще нет.

    create: function(model) {
    if (!model.id) model.id = model.attributes.id = guid();
    this.data[model.id] = model;
    this.save();
    return model;
},

// Обновляет модель, заменив ее копией в this.data.

    update: function(model) {
    this.data[model.id] = model;
    this.save();
    return model;
},

// Позволяет получить модель из this.data по id.

    find: function(model) {
    return this.data[model.id];
},

// Возвращает массив всех моделей из текущего хранилища.

    findAll: function() {
    return _.values(this.data);
},

// Удаляет модель из this.data, и возвращает ее.

    destroy: function(model) {
    delete this.data[model.id];
    this.save();
    return model;
}

});

// Переопределяем Backbone.sync для использования с моделью или коллекцией в localStorage, который должен быть экземпляром хранилища Store.

    Backbone.sync = function(method, model, options) {

    var resp;
    var store = model.localStorage || model.collection.localStorage;

    switch (method) {
        case "read":    resp = model.id ? store.find(model) : store.findAll(); break;
        case "create":  resp = store.create(model);                            break;
        case "update":  resp = store.update(model);                            break;
        case "delete":  resp = store.destroy(model);                           break;
    }

    if (resp) {
        options.success(resp);
    } else {
        options.error("Record not found");
    }
};
