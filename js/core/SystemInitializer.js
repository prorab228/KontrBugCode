class SystemInitializer {
    static initialize() {
        // Проверяем, инициализирована ли система
        if (window.SystemInitialized) {
            console.log('Система уже инициализирована');
            return;
        }

        try {
            // Создаём глобальные менеджеры в правильном порядке
            if (!window.ParserManager) {
                window.ParserManager = new ParserManager();
                console.log('ParserManager инициализирован');
            }

            if (!window.LibraryManager) {
                window.LibraryManager = new LibraryManager();
                console.log('LibraryManager инициализирован');
            }

            if (!window.HelperGenerator) {
                window.HelperGenerator = new HelperGenerator();
                console.log('HelperGenerator инициализирован');
            }

            if (!window.InitializationGenerator) {
                window.InitializationGenerator = new InitializationGenerator();
                console.log('InitializationGenerator инициализирован');
            }

            if (!window.CodeGenerator) {
                window.CodeGenerator = CodeGenerator;
                console.log('CodeGenerator инициализирован');
            }

            // Устанавливаем флаг инициализации
            window.SystemInitialized = true;
            console.log('Система полностью инициализирована');

        } catch (error) {
            console.error('Ошибка инициализации системы:', error);
        }
    }
}

// Автоматическая инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => SystemInitializer.initialize(), 100);
    });
} else {
    setTimeout(() => SystemInitializer.initialize(), 100);
}