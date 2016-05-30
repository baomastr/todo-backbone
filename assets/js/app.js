 $ (function () {

        // Todo Model
        var Todo = Backbone.Model.extend({

            // Наша базовая Todo модель будет имеет следующие атрибуты: title, order, и done.
            defaults: function () {
                return {
                    title: "Новая задача...",
                    order: Todos.nextOrder(),
                    done: false
                };
            },

            // Убедимся, что каждый созданный элемент списка задач имеет название title.
            initialize: function () {
                if (!this.get("title")){
                    this.set({"title": this.defaults.title});
                }
            },

            // Этот метод переключает состояние done текущего элемента списка задач.
            toggle: function () {
                this.save({done: !this.get("done")});
            },

            // Этот метод удаляет данные Todo из localStorage и удаляет его представления.
            clear: function () {
                this.destroy();
            }
        });

        // Todo Collection
        // Коллекция списка задач поддерживается с помощью локального хранилища (localStorage), а не на удаленном сервере.
        var TodoList = Backbone.Collection.extend({

            // Ссылка на модель для этой коллекции.
            model: Todo,

            // Сохраняем все элементы списка задач с неймспейсом "todos-backbone".
            localStorage: new Store("todos-backbone"),

            // Фильтр по списку задач, которые были завершены.
            done: function () {
                return this.filter(function (todo) {
                    return todo.get('done');
                });
            },

            // Фильтр по списку задач, которые до сих пор не закончены.
            remaining: function () {
                return this.without.apply(this, this.done());
            },

            // Мы храним задачи в последовательном порядке, несмотря на то, что сохраняем неупорядоченный GUID в базе данных. Этот метод создает следующий номер для новых элементов списка задач.
            nextOrder: function () {
                if (!this.length) return 1;
                return this.last().get('order') + 1;
            },

            // Задачи сортируются по их первоначальному порядку добавления.
            comparator: function (todo) {
                return todo.get('order');
            }

        });

        // Создадим нашу глобальную коллекцию Todos.
        var Todos = new TodoList;

        // Todo Item View
        // Элемент DOM для элемента в списке задач (Todo Item)…
        var TodoView = Backbone.View.extend({

            // ... будет li, тег списка.
            tagName: "li",

            // Кэшируем функцию шаблона для одного элемента.
            template: _.template($('#item-template').html()),

            // DOM события, характерные для элемента.
            events: {
                "click .toggle" : "toggleDone",
                "dblclick .view" : "edit",
                "click a.destroy" : "clear",
                "keypress .edit" : "updateOnEnter",
                "blur .edit" : "close"
            },

            // TodoView ожидает изменения в модели, для повторного рендеринга. Так что есть связь один-к-одному между моделью Todo и представлением TodoView. В этом приложении мы установили прямые ссылки на модели для удобства.
            initialize: function() {
                this.model.bind('change', this.render, this);
                this.model.bind('destroy', this.remove, this);
            },

            // Рендеринг элемента (задачи) в списке задач.
            render: function() {
                this.$el.html(this.template(this.model.toJSON()));
                this.$el.toggleClass('done', this.model.get('done'));
                this.input = this.$('.edit');
                return this;
            },

            // Переключает состояние "done" в модели.
            toggleDone: function() {
                this.model.toggle();
            },

            // Переключает представление в режим редактирования "editing", отображает поле для ввода текста.
            edit: function() {
                this.$el.addClass("editing");
                this.input.focus();
            },

            // Закрывает режим редактирования "editing", сохраняя изменения в todo.
            close: function() {
                var value = this.input.val();
                if (!value) this.clear();
                this.model.save({title: value});
                this.$el.removeClass("editing");
            },

            // Закрывает режим редактирования элемента по нажатию enter.
            updateOnEnter: function(e) {
                if (e.keyCode == 13) this.close();
            },

            // Этот метод удаляет элемент в списке задач и удаляет его модель.
            clear: function() {
                this.model.clear();
            }
        });

        // The Application

        // Наше главное представление AppView является частью верхнего уровня пользовательского интерфейса.
        var AppView = Backbone.View.extend({

            // Вместо создания нового элемента, связываем с присутствующим в HTML элементом.
            el: $("#todoapp"),

            // Наш шаблон для строки статистики в нижней части приложения.
            statsTemplate: _.template($('#stats-template').html()),

            // Делегированных событий для создания новых элементов, а также очистки завершенных.
            events: {
                "keypress #new-todo":  "createOnEnter",
                "click #clear-completed": "clearCompleted",
                "click #toggle-all": "toggleAllComplete"
            },

            // При инициализации мы навешиваем соответствующие события на коллекцию Todos, на добавление или изменение элемента списка задач. Получаем существующие задачи, которые могут быть сохранены в localStorage.
            initialize: function() {

                this.input = this.$("#new-todo");
                this.allCheckbox = this.$("#toggle-all")[0];

                Todos.bind('add', this.addOne, this);
                Todos.bind('reset', this.addAll, this);
                Todos.bind('all', this.render, this);

                this.footer = this.$('footer');
                this.main = $('#main');

                Todos.fetch();
            },

            // Рендеринг приложения просто обновляет статистику — остальное в приложении не изменится.
            render: function() {
                var done = Todos.done().length;
                var remaining = Todos.remaining().length;

                if (Todos.length) {
                    this.main.show();
                    this.footer.show();
                    this.footer.html(this.statsTemplate({done: done, remaining: remaining}));
                } else {
                    this.main.hide();
                    this.footer.hide();
                }

                this.allCheckbox.checked = !remaining;
            },

            // Добавляем один элемент в список задач, создав представление для него, и добавим его в элемент <ul>.
            addOne: function(todo) {
                var view = new TodoView({model: todo});
                this.$("#todo-list").append(view.render().el);
            },

            // Добавить все элементы коллекции Todos сразу.
            addAll: function() {
                Todos.each(this.addOne);
            },

            // Если вы нажмете клавишу "Enter" в основном поле ввода, создастся новая модель Todo, и сохранится в localStorage.
            createOnEnter: function(e) {
                if (e.keyCode != 13) return;
                if (!this.input.val()) return;

                Todos.create({title: this.input.val()});
                this.input.val('');
            },

            // Очистить все завершенные элементы списка задач, уничтожая их модели.
            clearCompleted: function() {
                _.each(Todos.done(), function(todo){ todo.clear(); });
                return false;
            },

            toggleAllComplete: function () {
                var done = this.allCheckbox.checked;
                Todos.each(function (todo) { todo.save({'done': done}); });
            }
        });

        // Наконец, мы можем запустить приложение App.
        var App = new AppView;

        // var App = app || {};
        // var ENTER_KEY = 13;
        // var ESC_KEY = 27;
        //
        // $(function () {
        //     'use strict';
        //
        //     // kick things off by creating the `App`
        //     new app.AppView();
        // });
    });
// $(document).ready(function(){
//     var App = new AppView;
// });
