
// CodeEditor.js - с исправленной инициализацией
class CodeEditor {
    static _initialized = false;

    static init() {
        if (this._initialized) return;

        this.editor = document.getElementById('codeEditor');
        this.preview = document.getElementById('codeEditorPreview');

        if (!this.editor || !this.preview) {
            console.error('CodeEditor: Required elements not found');
            return;
        }



        this.autocomplete = new AutocompleteManager();
        this.tabManager = new TabManager();
        this.errorHighlighter = new ErrorHighlighter();
        this.currentErrorIndex = 0;
        this.lineNumbers = this.createLineNumbers();

        this.setupEditor();
        this.setupEventListeners();
        this.setupErrorHighlighting();
        
        // Асинхронная инициализация провайдера библиотек
        this.initLibraryProvider();


        
        console.log('CodeEditor initialized');
        this._initialized = true;
    }

    // Асинхронная инициализация провайдера библиотек
    static async initLibraryProvider() {
        if (this.autocomplete && this.autocomplete.providers) {
            const enhancedProvider = this.autocomplete.providers.find(
                p => p instanceof EnhancedDynamicLibraryProvider
            );
            if (enhancedProvider) {
                try {
                    const projectPath = window.projectPath || '.';
                    await enhancedProvider.init(projectPath);
                    console.log('EnhancedDynamicLibraryProvider initialized');
                } catch (error) {
                    console.warn('Failed to initialize library provider:', error);
                }
            }
        }
    }

    // Остальные методы без изменений...
    static setupEditor() {
        const wrapper = this.editor.parentNode;
        if (wrapper && !wrapper.classList.contains('code-editor-wrapper')) {
            wrapper.classList.add('code-editor-wrapper');
        }

        if (!wrapper.querySelector('.line-numbers')) {
            wrapper.insertBefore(this.lineNumbers, this.editor);
        }

        this.updateLineNumbers();
    }


    static createLineNumbers() {
        const lineNumbers = document.createElement('div');
        lineNumbers.className = 'line-numbers';
        return lineNumbers;
    }

    static updateLineNumbers() {
        if (!this.editor || !this.lineNumbers) return;

        const lines = this.editor.value.split('\n');
        const lineCount = lines.length;

        let numbersHTML = '';
        for (let i = 1; i <= lineCount; i++) {
            numbersHTML += `<div class="line-number" data-line="${i}">${i}</div>`;
        }

        this.lineNumbers.innerHTML = numbersHTML;
        this.syncLineNumbersScroll();
    }

    static syncLineNumbersScroll() {
        if (this.lineNumbers) {
            this.lineNumbers.scrollTop = this.editor.scrollTop;
        }
    }

    static setupEventListeners() {
        // Обработка ввода
        this.editor.addEventListener('input', (e) => {
            console.log('Input event in editor');
            this.handleInput(e.target.value);
            if (window.AutoBracketHandler) {
                window.AutoBracketHandler.autoCloseBrackets(e);
            }
        });

        // Синхронизация скролла
        this.editor.addEventListener('scroll', () => {
            this.preview.scrollTop = this.editor.scrollTop;
            this.preview.scrollLeft = this.editor.scrollLeft;
            this.preview.style.height = this.editor.offsetHeight + 'px';
            this.preview.style.width = this.editor.offsetWidth + 'px';
            this.syncLineNumbersScroll();
        });

        // Также синхронизируем в обратную сторону (на всякий случай)
        this.preview.addEventListener('scroll', () => {
            this.editor.scrollTop = this.preview.scrollTop;
            this.editor.scrollLeft = this.preview.scrollLeft;
        });

        // Обработка клавиш
        this.editor.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Обновление номеров строк при изменении размера
        window.addEventListener('resize', () => {
            this.updateLineNumbers();
        });

        document.addEventListener('click', (e) => {
            if (!this.editor.contains(e.target) &&
                this.autocomplete.container &&
                !this.autocomplete.container.contains(e.target)) {
                this.autocomplete.hide();
            }
        });
		
		// ВОССТАНОВЛЕНО: обработка Backspace для авто-закрытия
        this.editor.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && window.AutoBracketHandler) {
                window.AutoBracketHandler.handleBackspace(e);
            }
        });

        // Горячие клавиши для навигации по ошибкам
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === '.') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.navigateToPreviousError();
                } else {
                    this.navigateToNextError();
                }
            }

            // Дебаггинг ошибок
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.errorHighlighter.debugErrors(this.editor.value);
            }
        });

        // Клик по номеру строки для навигации
        this.lineNumbers.addEventListener('click', (e) => {
            if (e.target.classList.contains('line-number')) {
                const lineNumber = parseInt(e.target.dataset.line);
                this.navigateToLine(lineNumber);
            }
        });
    }

    static navigateToLine(lineNumber) {
        const lines = this.editor.value.split('\n');
        let position = 0;

        for (let i = 0; i < lineNumber - 1; i++) {
            position += lines[i].length + 1;
        }

        this.editor.focus();
        this.editor.setSelectionRange(position, position);

        // Прокручиваем к строке
        const lineHeight = this.getLineHeight();
        const visibleLines = Math.floor(this.editor.clientHeight / lineHeight);
        const targetLine = Math.max(0, lineNumber - Math.floor(visibleLines / 2));

        this.editor.scrollTop = targetLine * lineHeight;
    }

    static setupErrorHighlighting() {
        this.debouncedErrorCheck = this.debounce((code) => {
            if (this.editor) {
                this.errorHighlighter.highlightErrors(code, this.editor);
                this.highlightErrorLines();
            }
        }, 500);

        this.editor.addEventListener('input', () => {
            this.debouncedErrorCheck(this.editor.value);
        });

        // Первоначальная проверка
        setTimeout(() => {
            this.debouncedErrorCheck(this.editor.value);
        }, 1000);
    }

    static highlightErrorLines() {
        const lineNumbers = this.lineNumbers.querySelectorAll('.line-number');
        lineNumbers.forEach(lineNumber => {
            lineNumber.classList.remove('error-line', 'warning-line', 'info-line');
        });

        const issues = this.errorHighlighter.currentIssues || [];
        const issuesByLine = {};

        issues.forEach(issue => {
            if (!issuesByLine[issue.line]) {
                issuesByLine[issue.line] = [];
            }
            issuesByLine[issue.line].push(issue);
        });

        Object.keys(issuesByLine).forEach(lineNumber => {
            const lineIssues = issuesByLine[lineNumber];
            const highestSeverity = this.getHighestSeverity(lineIssues);
            const lineElement = this.lineNumbers.querySelector(`.line-number[data-line="${lineNumber}"]`);

            if (lineElement) {
                lineElement.classList.add(`${highestSeverity}-line`);
            }
        });
    }

    static getHighestSeverity(issues) {
        const severities = { error: 3, warning: 2, info: 1 };
        return issues.reduce((highest, issue) => {
            return severities[issue.severity] > severities[highest] ? issue.severity : highest;
        }, 'info');
    }

    static handleInput(code) {
        this.highlightCode(code);
        console.log('Checking autocomplete...', code);
        this.autocomplete.check(code, this.editor);
        this.updateLineNumbers();
        this.debouncedErrorCheck(code);

        // Принудительно обновляем маркеры ошибок
        if (this.errorHighlighter) {
            setTimeout(() => {
                this.errorHighlighter.updateMarkerPositions(this.editor);
            }, 50);
        }
    }

    static handleKeyDown(e) {
        const handledKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'];

        if (this.autocomplete.isVisible && handledKeys.includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
        }

        switch (e.key) {
            case 'Tab':
                if (this.autocomplete.isVisible) {
                    this.autocomplete.applySelected();
                } else {
                    e.preventDefault();
                    this.tabManager.handleSelectionTab(this.editor, e.shiftKey);

                    this.highlightCode(this.editor.value);
                    this.updateLineNumbers();
                    this.debouncedErrorCheck(this.editor.value);
                }
                break;

            case 'z':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.handleUndo();
                }
                break;

            case 'y':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.handleRedo();
                }
                break;

            case 'Enter':
                if (this.autocomplete.isVisible) {
                    this.autocomplete.applySelected();
                } else {
                    e.preventDefault();
                    if (this.tabManager.handleEnterKey(this.editor)) {
                        this.highlightCode(this.editor.value);
                        this.updateLineNumbers();
                        this.debouncedErrorCheck(this.editor.value);
                    }
                }
                break;

            case 'ArrowDown':
                if (this.autocomplete.isVisible) {
                    this.autocomplete.selectNext();
                }
                break;

            case 'ArrowUp':
                if (this.autocomplete.isVisible) {
                    this.autocomplete.selectPrevious();
                }
                break;

            case 'Escape':
                if (this.autocomplete.isVisible) {
                    this.autocomplete.hide();
                } else {
                    // Снимаем выделение
                    const cursorPos = this.editor.selectionEnd;
                    this.editor.selectionStart = cursorPos;
                    this.editor.selectionEnd = cursorPos;
                    e.preventDefault();
                }
                break;

            case ' ':
                if (e.ctrlKey && !this.autocomplete.isVisible) {
                    e.preventDefault();
                    const currentWord = this.autocomplete.getCurrentWord();
                    if (currentWord) {
                        this.autocomplete.show(currentWord, this.editor);
                    } else {
                        this.autocomplete.show('', this.editor);
                    }
                }
                break;
        }
    }

    static navigateToNextError() {
        if (!this.editor) return;
        const results = this.errorHighlighter.errorChecker.checkCode(this.editor.value);
        this.errorHighlighter.navigateToNextIssue(results.errors, this.editor);
    }

    static navigateToPreviousError() {
        if (!this.editor) return;
        const results = this.errorHighlighter.errorChecker.checkCode(this.editor.value);
        this.navigateToPreviousIssue(results.errors, this.editor);
    }

    static navigateToNextWarning() {
        if (!this.editor) return;
        const results = this.errorHighlighter.errorChecker.checkCode(this.editor.value);
        this.errorHighlighter.navigateToNextIssue(results.warnings, this.editor);
    }

    static navigateToNextInfo() {
        if (!this.editor) return;
        const results = this.errorHighlighter.errorChecker.checkCode(this.editor.value);
        this.errorHighlighter.navigateToNextIssue(results.infos, this.editor);
    }

    static navigateToPreviousIssue(issues, editorElement) {
        if (issues.length === 0) return;

        const currentPosition = editorElement.selectionStart;
        const lines = editorElement.value.split('\n');

        let previousIssue = null;
        for (let i = issues.length - 1; i >= 0; i--) {
            const issue = issues[i];
            let issuePosition = 0;
            for (let j = 0; j < issue.line - 1; j++) {
                issuePosition += lines[j].length + 1;
            }
            issuePosition += issue.column;

            if (issuePosition < currentPosition) {
                previousIssue = issue;
                break;
            }
        }

        if (!previousIssue) {
            previousIssue = issues[issues.length - 1];
        }

        this.errorHighlighter.navigateToError(editorElement, previousIssue.line, previousIssue.column);
    }

    static showErrorHelp() {
        const helpMessage = `
❌ Ошибки: Критические проблемы, которые помешают компиляции кода
⚠️ Предупреждения: Потенциальные проблемы, которые стоит исправить
ℹ️ Заметки: Рекомендации по улучшению кода

Горячие клавиши:
• Ctrl+. - Следующая ошибка
• Ctrl+Shift+. - Предыдущая ошибка
• Клик на маркер - Перейти к ошибке
• Наведение на маркер - Показать описание
• Клик на номер строки - Перейти к строке
        `;
        alert(helpMessage);
    }

    static highlightCode(code) {
        if (!window.hljs) {
            this.preview.textContent = code;
            return;
        }

        try {
            // Сохраняем информацию о наличии перевода строки в конце
            const hasTrailingNewline = code.endsWith('\n');

            const highlighted = hljs.highlight(code, {
                language: 'arduino',
                ignoreIllegals: true
            }).value;

            // Если был перевод строки в конце - добавляем его обратно
            let finalHighlighted = highlighted;
            if (hasTrailingNewline) {
                finalHighlighted += '\n';
            }

            this.preview.innerHTML = finalHighlighted;
        } catch (error) {
            console.warn('Highlighting error:', error);
            // При ошибке тоже сохраняем перевод строки
            const hasTrailingNewline = code.endsWith('\n');
            this.preview.textContent = code + (hasTrailingNewline ? '\n' : '');
        }
    }

    static getLineHeight() {
        const computedStyle = window.getComputedStyle(this.editor);
        const lineHeight = parseInt(computedStyle.lineHeight) || 20;
        return lineHeight;
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static getValue() {
        return this.editor ? this.editor.value : '';
    }

    static setValue(code) {
        if (this.editor) {
            this.editor.value = code;
            this.highlightCode(code);
            this.updateLineNumbers();
            if (this.debouncedErrorCheck) {
                this.debouncedErrorCheck(code);
            }
        }
    }

    static focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }

    static clearErrors() {
        if (this.errorHighlighter) {
            this.errorHighlighter.clearErrors();
        }
    }

    static forceErrorCheck() {
        if (this.editor && this.errorHighlighter) {
            this.errorHighlighter.highlightErrors(this.editor.value, this.editor);
        }
    }


    static handleUndo() {
        // Используем команду execCommand для отмены
        document.execCommand('undo');

        // После отмены обновляем состояние редактора
        setTimeout(() => {
            this.highlightCode(this.editor.value);
            this.updateLineNumbers();
            this.debouncedErrorCheck(this.editor.value);
        }, 0);
    }

    static handleRedo() {
        // Используем команду execCommand для повтора
        document.execCommand('redo');

        // После повтора обновляем состояние редактора
        setTimeout(() => {
            this.highlightCode(this.editor.value);
            this.updateLineNumbers();
            this.debouncedErrorCheck(this.editor.value);
        }, 0);
    }
}

window.CodeEditor = CodeEditor;
