class ThemeManager {
    static init() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(this.currentTheme);
        this.createThemeToggle();
    }

    static createThemeToggle() {
        // Проверяем, не добавлен ли уже переключатель
        if (document.querySelector('.theme-toggle')) return;

        const themeToggle = document.createElement('button');
        themeToggle.className = 'btn btn-secondary theme-toggle';
        themeToggle.innerHTML = this.currentTheme === 'dark' ?
            '<span class="icon btn-theme"></span> Светлая' :
            '<span class="icon btn-theme"></span> Тёмная';
        themeToggle.onclick = () => this.toggleTheme();
        themeToggle.title = 'Переключить тему';

        const controls = document.querySelector('.controls .control-group');
        if (controls) {
            // Добавляем кнопку в начало второй группы управления
            controls.appendChild(themeToggle);
        }
    }

    static toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme(this.currentTheme);

        // Обновляем текст кнопки
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = this.currentTheme === 'dark' ?
                '<span class="icon btn-theme"></span>' :
                '<span class="icon btn-theme"></span>';
        }

        // Показываем уведомление
        if (window.UIManager) {
            window.UIManager.showNotification(`Тема изменена на ${this.currentTheme === 'dark' ? 'тёмную' : 'светлую'}`);
        }
    }

    static applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);

        // Обновляем стили Blockly для темной темы
        this.updateBlocklyTheme(theme);
    }

    static updateBlocklyTheme(theme) {
        if (theme === 'dark') {
            // Темная тема для Blockly
            document.documentElement.style.setProperty('--blockly-bg', '#1e1e1e');
            document.documentElement.style.setProperty('--blockly-text', '#ffffff');
            document.documentElement.style.setProperty('--blockly-grid', '#2d2d2d');
        } else {
            // Светлая тема для Blockly
            document.documentElement.style.setProperty('--blockly-bg', '#ffffff');
            document.documentElement.style.setProperty('--blockly-text', '#575e75');
            document.documentElement.style.setProperty('--blockly-grid', '#e0e0e0');
        }
    }
}

// Регистрируем класс в глобальной области видимости
window.ThemeManager = ThemeManager;