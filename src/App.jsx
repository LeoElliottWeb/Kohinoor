import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

// ==========================================
// 🚀 TRANSLATION CACHE & GLOBALS
// ==========================================
const translationCache = new Map();
const lastTranslationTime = {};

// ==========================================
// 🌍 UI TRANSLATION DICTIONARY
// ==========================================
const uiDict = {
    'en': {
        search: "🔍 Search users...", online: "Online", members: "Registered Users", contacts: "Saved Contacts",
        logout: "Logout", openTranslator: "🗣️ Open Local Translator", changeMobile: "📱 Change Mobile Number",
        addExternal: "+ Add External", selectContact: "Select a contact to start chatting",
        faceToFace: "Talking face-to-face with someone?", messagePlaceholder: "Message or paste image/link...",
        recording: "Recording audio...", callMobile: "📞 Call Mobile", call: "📹 Call", add: "➕ Add",
        end: "🔴 End", uiLang: "🌐 UI Language", activeCall: "📞 Active Call - Tap to Return",
        login: "Log In", signup: "Sign Up", forgotPwd: "Forgot Password?", createAcc: "Create Account",
        backLogin: "Back to Login", email: "Email", password: "Password (min 6 characters)", mobile: "Mobile Number (Mandatory)",
        sendReset: "Send Reset Link", loading: "Loading...", sending: "Sending...",
        resetMsg: "Enter your email address and we'll send you a link to reset your password.",
        checkEmail: "✅ Check your email"
    },
    'es': {
        search: "🔍 Buscar usuarios...", online: "En línea", members: "Usuarios Registrados", contacts: "Contactos Guardados",
        logout: "Cerrar sesión", openTranslator: "🗣️ Traductor Local", changeMobile: "📱 Cambiar Móvil",
        addExternal: "+ Añadir Externo", selectContact: "Selecciona un contacto para chatear",
        faceToFace: "¿Hablando cara a cara?", messagePlaceholder: "Mensaje o pegar imagen/enlace...",
        recording: "Grabando audio...", callMobile: "📞 Llamar Móvil", call: "📹 Llamar", add: "➕ Añadir",
        end: "🔴 Fin", uiLang: "🌐 Idioma de UI", activeCall: "📞 Llamada Activa - Volver",
        login: "Iniciar sesión", signup: "Registrarse", forgotPwd: "¿Contraseña olvidada?", createAcc: "Crear Cuenta",
        backLogin: "Volver al Login", email: "Correo electrónico", password: "Contraseña (min 6 caracteres)", mobile: "Número de Móvil (Obligatorio)",
        sendReset: "Enviar enlace", loading: "Cargando...", sending: "Enviando...",
        resetMsg: "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.",
        checkEmail: "✅ Revisa tu correo"
    },
    'fr': {
        search: "🔍 Rechercher...", online: "En ligne", members: "Utilisateurs Inscrits", contacts: "Contacts Enregistrés",
        logout: "Déconnexion", openTranslator: "🗣️ Traducteur Local", changeMobile: "📱 Changer de Mobile",
        addExternal: "+ Ajouter Externe", selectContact: "Sélectionnez un contact pour discuter",
        faceToFace: "Vous parlez face à face ?", messagePlaceholder: "Message ou coller image/lien...",
        recording: "Enregistrement audio...", callMobile: "📞 Appeler Mobile", call: "📹 Appeler", add: "➕ Ajouter",
        end: "🔴 Fin", uiLang: "🌐 Langue de l'interface", activeCall: "📞 Appel en cours - Retour",
        login: "Connexion", signup: "S'inscrire", forgotPwd: "Mot de passe oublié ?", createAcc: "Créer un compte",
        backLogin: "Retour", email: "E-mail", password: "Mot de passe (min 6 caractères)", mobile: "Numéro de Mobile (Obligatoire)",
        sendReset: "Envoyer le lien", loading: "Chargement...", sending: "Envoi...",
        resetMsg: "Entrez votre e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.",
        checkEmail: "✅ Vérifiez vos e-mails"
    },
    'de': {
        search: "🔍 Suchen...", online: "Online", members: "Registrierte Nutzer", contacts: "Gespeicherte Kontakte",
        logout: "Abmelden", openTranslator: "🗣️ Lokaler Übersetzer", changeMobile: "📱 Handynummer ändern",
        addExternal: "+ Extern Hinzufügen", selectContact: "Wählen Sie einen Kontakt zum Chatten",
        faceToFace: "Sprechen Sie von Angesicht zu Angesicht?", messagePlaceholder: "Nachricht oder Bild/Link einfügen...",
        recording: "Audio aufnehmen...", callMobile: "📞 Handy anrufen", call: "📹 Anrufen", add: "➕ Hinzufügen",
        end: "🔴 Beenden", uiLang: "🌐 UI-Sprache", activeCall: "📞 Aktiver Anruf - Zurück",
        login: "Anmelden", signup: "Registrieren", forgotPwd: "Passwort vergessen?", createAcc: "Konto erstellen",
        backLogin: "Zurück zum Login", email: "E-Mail", password: "Passwort (min 6 Zeichen)", mobile: "Handynummer (Pflichtfeld)",
        sendReset: "Link senden", loading: "Wird geladen...", sending: "Senden...",
        resetMsg: "Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.",
        checkEmail: "✅ E-Mails prüfen"
    },
    'it': {
        search: "🔍 Cerca utenti...", online: "In linea", members: "Utenti Registrati", contacts: "Contatti Salvati",
        logout: "Esci", openTranslator: "🗣️ Traduttore Locale", changeMobile: "📱 Cambia Cellulare",
        addExternal: "+ Aggiungi Esterno", selectContact: "Seleziona un contatto per chattare",
        faceToFace: "Stai parlando faccia a faccia?", messagePlaceholder: "Messaggio o incolla immagine/link...",
        recording: "Registrazione audio...", callMobile: "📞 Chiama Cellulare", call: "📹 Chiama", add: "➕ Aggiungi",
        end: "🔴 Fine", uiLang: "🌐 Lingua interfaccia", activeCall: "📞 Chiamata Attiva - Indietro",
        login: "Accedi", signup: "Registrati", forgotPwd: "Password dimenticata?", createAcc: "Crea Account",
        backLogin: "Torna al Login", email: "Email", password: "Password (min 6 caratteri)", mobile: "Numero di cellulare (Obbligatorio)",
        sendReset: "Invia Link", loading: "Caricamento...", sending: "Invio...",
        resetMsg: "Inserisci la tua email e ti invieremo un link per reimpostare la password.",
        checkEmail: "✅ Controlla la tua email"
    },
    'pt': {
        search: "🔍 Pesquisar...", online: "Online", members: "Usuários Registrados", contacts: "Contatos Salvos",
        logout: "Sair", openTranslator: "🗣️ Tradutor Local", changeMobile: "📱 Mudar Número",
        addExternal: "+ Adicionar Externo", selectContact: "Selecione um contato para conversar",
        faceToFace: "Conversando cara a cara?", messagePlaceholder: "Mensagem ou colar imagem/link...",
        recording: "Gravando áudio...", callMobile: "📞 Ligar Móvel", call: "📹 Ligar", add: "➕ Adicionar",
        end: "🔴 Fim", uiLang: "🌐 Idioma da Interface", activeCall: "📞 Chamada Ativa - Voltar",
        login: "Entrar", signup: "Inscrever-se", forgotPwd: "Esqueceu a senha?", createAcc: "Criar Conta",
        backLogin: "Voltar", email: "E-mail", password: "Senha (min 6 caracteres)", mobile: "Número de Celular (Obrigatório)",
        sendReset: "Enviar Link", loading: "Carregando...", sending: "Enviando...",
        resetMsg: "Digite seu e-mail e enviaremos um link para redefinir sua senha.",
        checkEmail: "✅ Verifique seu e-mail"
    },
    'zh': {
        search: "🔍 搜索...", online: "在线", members: "注册用户", contacts: "保存的联系人",
        logout: "登出", openTranslator: "🗣️ 本地翻译器", changeMobile: "📱 更改手机号",
        addExternal: "+ 添加外部", selectContact: "选择联系人开始聊天",
        faceToFace: "面对面交谈？", messagePlaceholder: "留言或粘贴图像/链接...",
        recording: "录音中...", callMobile: "📞 拨打手机", call: "📹 通话", add: "➕ 添加",
        end: "🔴 结束", uiLang: "🌐 界面语言", activeCall: "📞 通话中 - 点击返回",
        login: "登录", signup: "注册", forgotPwd: "忘记密码？", createAcc: "创建账户",
        backLogin: "返回登录", email: "电子邮件", password: "密码（最少6个字符）", mobile: "手机号码（必填）",
        sendReset: "发送重置链接", loading: "加载中...", sending: "发送中...",
        resetMsg: "输入您的电子邮件，我们将向您发送重置密码的链接。",
        checkEmail: "✅ 检查您的电子邮件"
    },
    'ja': {
        search: "🔍 ユーザーを検索...", online: "オンライン", members: "登録ユーザー", contacts: "保存された連絡先",
        logout: "ログアウト", openTranslator: "🗣️ ローカル翻訳を開く", changeMobile: "📱 携帯番号を変更",
        addExternal: "+ 外部追加", selectContact: "チャットする連絡先を選択してください",
        faceToFace: "対面で話していますか？", messagePlaceholder: "メッセージまたは画像/リンクを貼り付け...",
        recording: "音声を録音中...", callMobile: "📞 携帯に発信", call: "📹 通話", add: "➕ 追加",
        end: "🔴 終了", uiLang: "🌐 UI言語", activeCall: "📞 通話中 - タップして戻る",
        login: "ログイン", signup: "サインアップ", forgotPwd: "パスワードを忘れた場合", createAcc: "アカウントを作成",
        backLogin: "ログインに戻る", email: "メールアドレス", password: "パスワード (最小6文字)", mobile: "携帯番号 (必須)",
        sendReset: "リセットリンクを送信", loading: "読み込み中...", sending: "送信中...",
        resetMsg: "メールアドレスを入力すると、パスワードをリセットするためのリンクが送信されます。",
        checkEmail: "✅ メールを確認してください"
    },
    'ru': {
        search: "🔍 Поиск...", online: "В сети", members: "Зарегистрированные пользователи", contacts: "Сохраненные контакты",
        logout: "Выйти", openTranslator: "🗣️ Локальный переводчик", changeMobile: "📱 Изменить номер",
        addExternal: "+ Добавить контакт", selectContact: "Выберите контакт для общения",
        faceToFace: "Говорите лицом к лицу?", messagePlaceholder: "Сообщение или ссылка...",
        recording: "Запись аудио...", callMobile: "📞 Позвонить", call: "📹 Звонок", add: "➕ Добавить",
        end: "🔴 Завершить", uiLang: "🌐 Язык интерфейса", activeCall: "📞 Активный звонок - Вернуться",
        login: "Войти", signup: "Регистрация", forgotPwd: "Забыли пароль?", createAcc: "Создать аккаунт",
        backLogin: "Назад", email: "Эл. почта", password: "Пароль (минимум 6 символов)", mobile: "Мобильный номер (Обязательно)",
        sendReset: "Отправить ссылку", loading: "Загрузка...", sending: "Отправка...",
        resetMsg: "Введите свой адрес электронной почты, и мы отправим ссылку для сброса.",
        checkEmail: "✅ Проверьте почту"
    },
    'el': {
        search: "🔍 Αναζήτηση χρήστη...", online: "Σε σύνδεση", members: "Εγγεγραμμένοι χρήστες", contacts: "Αποθηκευμένες επαφές",
        logout: "Αποσύνδεση", openTranslator: "🗣️ Τοπικός μεταφραστής", changeMobile: "📱 Αλλαγή κινητού",
        addExternal: "+ Προσθήκη Εξωτερικής Επαφής", selectContact: "Επιλέξτε μια επαφή για συνομιλία",
        faceToFace: "Μιλάτε πρόσωπο με πρόσωπο;", messagePlaceholder: "Μήνυμα ή επικόλληση εικόνας/συνδέσμου...",
        recording: "Εγγραφή ήχου...", callMobile: "📞 Κλήση σε κινητό", call: "📹 Κλήση", add: "➕ Προσθήκη",
        end: "🔴 Τερματισμός", uiLang: "🌐 Γλώσσα UI", activeCall: "📞 Ενεργή Κλήση - Επιστροφή",
        login: "Σύνδεση", signup: "Εγγραφή", forgotPwd: "Ξεχάσατε τον κωδικό;", createAcc: "Δημιουργία Λογαριασμού",
        backLogin: "Επιστροφή στη σύνδεση", email: "Email", password: "Κωδικός (τουλ. 6 χαρακτήρες)", mobile: "Αριθμός Κινητού (Υποχρεωτικό)",
        sendReset: "Αποστολή συνδέσμου", loading: "Φόρτωση...", sending: "Αποστολή...",
        resetMsg: "Εισαγάγετε το email σας και θα σας στείλουμε έναν σύνδεσμο για επαναφορά.",
        checkEmail: "✅ Ελέγξτε το email σας"
    },
    'yo': {
        search: "🔍 Ṣàwárí àwọn olùmúlò...", online: "Lórí Ìkànnì", members: "Àwọn Olùmúlò", contacts: "Àwọn Olùbásọ̀rọ̀",
        logout: "Jáde", openTranslator: "🗣️ Ògbùfọ̀ Agbègbè", changeMobile: "📱 Yí Nọ́mbà Padà",
        addExternal: "+ Ṣàfikún Ìta", selectContact: "Yan olùbásọ̀rọ̀ láti bẹ̀rẹ̀",
        faceToFace: "Ṣé ẹ̀ ń sọ̀rọ̀ lójúkòójú?", messagePlaceholder: "Fi ránṣẹ́ tàbí lẹ̀ pọ̀...",
        recording: "Gbígbásílẹ̀ ohùn...", callMobile: "📞 Pe Alágbèéká", call: "📹 Pe", add: "➕ Ṣàfikún",
        end: "🔴 Parí", uiLang: "🌐 Èdè UI", activeCall: "📞 Ìpè Lọ́wọ́lọ́wọ́ - Padà",
        login: "Wọlé", signup: "Forúkọsílẹ̀", forgotPwd: "Gbàgbé Ọ̀rọ̀-ìkọkọ?", createAcc: "Ṣẹ̀dá Àkọọ́lẹ̀",
        backLogin: "Padà sí Wọlé", email: "Ímẹ́èlì", password: "Ọ̀rọ̀-ìkọkọ (kéré jù 6)", mobile: "Nọ́mbà Alágbèéká (Ọ̀bùdàn)",
        sendReset: "Fi Ọ̀nà asopọ ránsẹ́", loading: "Ń gbé e wá...", sending: "Ń firánṣẹ́...",
        resetMsg: "Tẹ ímẹ́èlì rẹ, a ó fi ọ̀nà asopọ ránṣẹ́ láti ṣètò rẹ̀.",
        checkEmail: "✅ Ṣàyẹ̀wò ímẹ́èlì rẹ"
    },
    'pl': {
        search: "🔍 Szukaj użytkowników...", online: "Dostępny", members: "Zarejestrowani użytkownicy", contacts: "Zapisane kontakty",
        logout: "Wyloguj się", openTranslator: "🗣️ Tłumacz lokalny", changeMobile: "📱 Zmień numer",
        addExternal: "+ Dodaj zewnętrzny", selectContact: "Wybierz kontakt, aby rozpocząć czat",
        faceToFace: "Rozmawiacie twarzą w twarz?", messagePlaceholder: "Wiadomość lub wklej obraz/link...",
        recording: "Nagrywanie dźwięku...", callMobile: "📞 Zadzwoń na komórkę", call: "📹 Zadzwoń", add: "➕ Dodaj",
        end: "🔴 Zakończ", uiLang: "🌐 Język interfejsu", activeCall: "📞 Aktywne połączenie - Powrót",
        login: "Zaloguj się", signup: "Zarejestruj się", forgotPwd: "Zapomniałeś hasła?", createAcc: "Utwórz konto",
        backLogin: "Powrót do logowania", email: "E-mail", password: "Hasło (min. 6 znaków)", mobile: "Numer komórkowy (Obowiązkowy)",
        sendReset: "Wyślij link", loading: "Ładowanie...", sending: "Wysyłanie...",
        resetMsg: "Podaj swój e-mail, a wyślemy Ci link do zresetowania hasła.",
        checkEmail: "✅ Sprawdź swój e-mail"
    }
};

const getBaseLang = (code) => (code ? code.split('-')[0] : 'en');
const t = (key, langCode) => {
    const base = getBaseLang(langCode);
    if (uiDict[base] && uiDict[base][key]) return uiDict[base][key];
    if (uiDict['en'] && uiDict['en'][key]) return uiDict['en'][key];
    return key;
};

// ==========================================
// 🎵 SIMPLE BELL RINGER & UNLOCKER
// ==========================================
class RingerManager {
    constructor() {
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isRinging = false;
        this.timeoutId = null;
        this.timeoutCallback = null;
    }

    unlock() {
        if (!this.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioContext = new AudioContext();
            }
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    playBell() {
        try {
            this.unlock();
            if (!this.audioContext) return;

            this.oscillator = this.audioContext.createOscillator();
            this.gainNode = this.audioContext.createGain();
            this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            this.oscillator.type = 'sine';
            this.gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            this.gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            this.oscillator.start(this.audioContext.currentTime);
            this.oscillator.stop(this.audioContext.currentTime + 0.8);
        } catch (e) { console.error('Audio play failed', e); }
    }

    start(type, onTimeout) {
        this.stop();
        this.isRinging = true;
        this.timeoutCallback = onTimeout;
        this.playBell();
        let ringCount = 0;
        const scheduleNextRing = () => {
            if (!this.isRinging) return;
            ringCount++;
            if (ringCount >= 20) { this.stop(); if (this.timeoutCallback) this.timeoutCallback(); return; }
            this.timeoutId = setTimeout(() => { if (this.isRinging) { this.playBell(); scheduleNextRing(); } }, 3000);
        };
        scheduleNextRing();
    }

    stop() {
        this.isRinging = false;
        if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; }
        if (this.oscillator) { try { this.oscillator.stop(); } catch (e) { } this.oscillator = null; }
        this.gainNode = null;
        this.timeoutCallback = null;

        if (this.audioContext && this.audioContext.state !== 'closed') {
            try { this.audioContext.suspend(); } catch (e) { }
        }
    }

    isActive() { return this.isRinging; }
}

const ringer = new RingerManager();

// ==========================================
// 🔗 LINK PARSER HELPER
// ==========================================
const urlExtractRegex = /((?:https?:\/\/|www\.)[^\s<]+[^<.,:;"')\]\s])/gi;

const renderTextWithLinks = (text) => {
    if (!text) return null;

    const parts = text.split(urlExtractRegex);
    let result = [];

    parts.forEach((part, i) => {
        if (part && part.match(urlExtractRegex)) {
            const href = part.startsWith('http') ? part : `https://${part}`;
            result.push(
                <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#38bdf8', textDecoration: 'underline', wordBreak: 'break-all' }}
                >
                    {part}
                </a>
            );
        } else if (part) {
            const lines = part.split('\n');
            lines.forEach((line, lineIndex) => {
                if (line) result.push(<span key={`${i}-${lineIndex}`}>{line}</span>);
                if (lineIndex < lines.length - 1) result.push(<br key={`${i}-br-${lineIndex}`} />);
            });
        }
    });

    return result;
};

// ==========================================
// 😊 EMOJI PICKER COMPONENT
// ==========================================
function EmojiPicker({ onSelectEmoji, onClose }) {
    const emojiCategories = {
        '😊': ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬'],
        '❤️': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '️', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️'],
        '👍': ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙇', '💁', '🙋', '🧏', '🙆', '🙅', '🤷', '🤦', '🙎', '🙍', '💇', '💆', '🧖', '💅', '🤳', '💃', '🕺', '👯', '🕴️', '👨‍🦽', '👩‍🦽', '🧑‍🦽', '👨‍🦼', '👩‍🦼', '🧑‍🦼'],
        '👋': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👣', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '舌', '👄', '🫦'],
        '🐱': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', 'crab', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊'],
        '🍕': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '芒果', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🫒', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫘', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪'],
        '🚗': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢'],
        '💡': ['💡', '🔦', '🕯️', '🧯', '🪔', '🧨', '💣', '🧲', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧪', '🧫', '🧬', '🔬', '🔭', '📡', '💉', '🩸', '💊', '🩹', '🩺', '🧹', '🧺', '🧻', '🪣', '🧼', '🫧', '🪥', '🧽', '🧴', '🪞', '🪟', '🚰', '🪠', '🪤', '🪣', '🧯'],
        '📱': ['📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '🧮', '🎥', '📽️', '📺', '📷', '📸', '📹', '📼', '🔍', '🔎', '🕯️', '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '📌', '📍', '✂️', '📐', '📏', '🧷', '📎', '🖇️', '📏', '📐', '✒️', '🖊️', '🖋️', '✏️', '🖍️', '🖌️', '🔏', '🔐', '🔒', '🔓']
    };

    const [selectedCategory, setSelectedCategory] = useState('😊');
    const categories = Object.keys(emojiCategories);
    const emojis = emojiCategories[selectedCategory] || [];

    const handleEmojiClick = (emoji) => {
        onSelectEmoji(emoji);
        onClose();
    };

    return (
        <div style={{ position: 'absolute', bottom: '70px', left: '10px', backgroundColor: '#202c33', borderRadius: '12px', padding: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', zIndex: 1000, width: '320px', maxHeight: '350px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '10px' }}>
                {categories.map(category => (
                    <button key={category} onClick={() => setSelectedCategory(category)} style={{ background: selectedCategory === category ? '#2a3942' : 'transparent', border: 'none', color: '#e9edef', fontSize: '20px', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                        {category}
                    </button>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px', overflowY: 'auto', padding: '4px', maxHeight: '220px' }}>
                {emojis.map((emoji, index) => (
                    <button key={index} onClick={() => handleEmojiClick(emoji)} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'background 0.2s', color: '#e9edef' }} onMouseEnter={(e) => e.currentTarget.style.background = '#2a3942'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ==========================================
// 🖼️ URL PREVIEW COMPONENT
// ==========================================
function LinkPreview({ url, style = {} }) {
    const [preview, setPreview] = useState(null);
    const [imgError, setImgError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!url) return;
        setImgError(false);
        setIsLoading(true);
        let isMounted = true;
        let cleanUrl = url.trim();
        if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;

        let hostname = '';
        try { hostname = new URL(cleanUrl).hostname; } catch (e) { hostname = 'link'; }
        const cleanHostname = hostname.replace('www.', '');

        if (isMounted) {
            setPreview({ title: 'Loading preview...', description: cleanUrl, image: null, publisher: cleanHostname, isLoading: true });
        }

        const fetchPreview = async () => {
            let ytImage = null;
            if (cleanUrl.includes('youtube.com/watch') || cleanUrl.includes('youtu.be/')) {
                const ytIdMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                if (ytIdMatch && ytIdMatch[1]) ytImage = `https://img.youtube.com/vi/${ytIdMatch[1]}/hqdefault.jpg`;
            }

            try {
                const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}&screenshot=true&meta=true`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && data.data) {
                        if (isMounted) {
                            const screenshotUrl = data.data.screenshot?.url;
                            const ogImage = data.data.image?.url;
                            const logoUrl = data.data.logo?.url;
                            const finalImage = ytImage || screenshotUrl || ogImage || logoUrl || null;
                            setPreview({ title: data.data.title || cleanHostname.toUpperCase(), description: data.data.description || data.data.og?.description || '', image: finalImage, publisher: data.data.publisher || data.data.og?.site_name || cleanHostname, isLoading: false });
                            setIsLoading(false);
                        }
                        return;
                    }
                }
            } catch (err) { console.log('Preview fetch error:', err); }

            if (ytImage && isMounted) {
                setPreview({ title: 'YouTube Video', description: 'Click to watch on YouTube', image: ytImage, publisher: 'YouTube', isLoading: false });
                setIsLoading(false);
                return;
            }

            if (isMounted) {
                setPreview({ title: cleanHostname.toUpperCase(), description: cleanUrl, image: `https://www.google.com/s2/favicons?domain=${cleanHostname}&sz=128`, publisher: cleanHostname, isLoading: false, isFallback: true });
                setIsLoading(false);
            }
        };

        fetchPreview();
        return () => { isMounted = false; };
    }, [url]);

    if (!preview) return null;
    if (preview.isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '12px 16px', marginTop: 8, gap: 12, border: '1px solid rgba(255,255,255,0.05)', ...style }}>
                <div style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                    <div style={{ height: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8, width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 4, width: '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
            </div>
        );
    }

    const hasImage = preview.image && !imgError && !preview.isFallback;

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginTop: 8, ...style }}>
            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', transition: 'background-color 0.2s ease', cursor: 'pointer', maxWidth: '100%' }}>
                {hasImage && (
                    <div style={{ width: '100%', height: 160, backgroundColor: '#1a1a1a', overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <img src={preview.image} alt={preview.title || 'Link preview'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={() => setImgError(true)} onLoad={() => setIsLoading(false)} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
                    </div>
                )}
                <div style={{ padding: hasImage ? '12px 14px 14px 14px' : '14px 16px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    {!hasImage && preview.image && <div style={{ marginBottom: 6 }}><img src={preview.image} alt="" style={{ width: 20, height: 20, borderRadius: 4 }} onError={(e) => e.target.style.display = 'none'} /></div>}
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#e9edef', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>{preview.title}</div>
                    {preview.description && preview.description !== preview.title && (
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5, marginTop: 2, marginBottom: 6 }}>{preview.description}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.3px' }}>{preview.publisher}</span>
                    </div>
                </div>
            </div>
        </a>
    );
}

// ==========================================
// 📝 SUBTITLE OVERLAY COMPONENT
// ==========================================
function SubtitleOverlay({ subtitle }) {
    if (!subtitle || (!subtitle.original && !subtitle.translated)) return null;

    const hasTranslation = subtitle.translated && subtitle.translated !== subtitle.original && subtitle.translated !== '...';

    return (
        <div style={{
            position: 'absolute', bottom: '30px', left: '0', right: '0',
            display: 'flex', justifyContent: 'center', zIndex: 20,
            pointerEvents: 'none', padding: '0 5%',
            animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <div style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                padding: '12px 24px', borderRadius: '12px', maxWidth: '90%',
                wordWrap: 'break-word', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {hasTranslation && (
                    <div style={{
                        fontSize: '20px', fontWeight: 'bold', color: '#38bdf8',
                        marginBottom: subtitle.original ? '6px' : '0',
                        textShadow: '0px 2px 4px rgba(0,0,0,0.8)', textAlign: 'center', lineHeight: '1.3'
                    }}>
                        {subtitle.translated}
                    </div>
                )}
                {subtitle.original && (
                    <div style={{
                        fontSize: hasTranslation ? '14px' : '20px',
                        fontWeight: hasTranslation ? 'normal' : 'bold',
                        color: hasTranslation ? '#aebac1' : '#ffffff',
                        fontStyle: hasTranslation ? 'italic' : 'normal',
                        textShadow: '0px 2px 4px rgba(0,0,0,0.8)', textAlign: 'center', lineHeight: '1.3'
                    }}>
                        {subtitle.original}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// 📺 LOCAL VIDEO COMPONENT
// ==========================================
function LocalVideo({ stream, subtitle }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl || !stream) return;
        videoEl.srcObject = stream;
        videoEl.muted = true;
        videoEl.play().catch(() => { });
        return () => { if (videoEl) videoEl.srcObject = null; };
    }, [stream]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullScreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullScreen = () => {
        const elem = containerRef.current;
        if (!isFullScreen) {
            if (elem.requestFullscreen) elem.requestFullscreen().catch(e => console.log(e));
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#111', borderRadius: isFullScreen ? '0' : '8px', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: isFullScreen ? 'contain' : 'cover', backgroundColor: '#000' }} />
            <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: 13, color: '#fff', zIndex: 10 }}>You</span>
            <button onClick={toggleFullScreen} title="Toggle Full Screen" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: 16, color: '#fff', zIndex: 10, cursor: 'pointer' }}>
                {isFullScreen ? '⤡' : '⤢'}
            </button>
            <SubtitleOverlay subtitle={subtitle} />
        </div>
    );
}

// ==========================================
// 📺 REMOTE VIDEO COMPONENT
// ==========================================
function RemoteVideo({ stream, email, allKnownUsers, subtitle, isTTSOn }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl || !stream) return;
        videoEl.srcObject = stream;
        videoEl.play().catch(() => { });
        return () => { if (videoEl) videoEl.srcObject = null; };
    }, [stream, email]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isTTSOn;
        }
    }, [isTTSOn]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullScreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullScreen = () => {
        const elem = containerRef.current;
        if (!isFullScreen) {
            if (elem.requestFullscreen) elem.requestFullscreen().catch(e => console.log(e));
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    };

    const safeEmail = email?.trim().toLowerCase();
    const contactName = allKnownUsers.find(c => c.email?.trim().toLowerCase() === safeEmail)?.name || email.split('@')[0];

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#111', borderRadius: isFullScreen ? '0' : '8px', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: isFullScreen ? 'contain' : 'cover', backgroundColor: '#000' }} />
            <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: 13, color: '#fff', zIndex: 10 }}>{contactName}</span>
            <button onClick={toggleFullScreen} title="Toggle Full Screen" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: 16, color: '#fff', zIndex: 10, cursor: 'pointer' }}>
                {isFullScreen ? '⤡' : '⤢'}
            </button>
            <SubtitleOverlay subtitle={subtitle} />
        </div>
    );
}

// ==========================================
// 🌐 SHARED LANGUAGE OPTIONS
// ==========================================
const LanguageOptions = () => (
    <>
        <option value="en-US">English</option>
        <option value="es-ES">Spanish</option>
        <option value="fr-FR">French</option>
        <option value="de-DE">German</option>
        <option value="it-IT">Italian</option>
        <option value="zh-CN">Chinese</option>
        <option value="ja-JP">Japanese</option>
        <option value="pt-PT">Portuguese (PT)</option>
        <option value="pt-BR">Portuguese (BR)</option>
        <option value="el-GR">Greek</option>
        <option value="ru-RU">Russian</option>
        <option value="yo-NG">Yoruba</option>
        <option value="pl-PL">Polish</option>
    </>
);


// ==========================================
// 🛡️ MAIN CHAT COMPONENT
// ==========================================
function ChatApp({ user, onLogout, uiLanguage, setUiLanguage }) {
    const userEmail = user?.email || '';
    const displayName = userEmail.split('@')[0];
    const isCapitalOlondra = userEmail.split('@')[0].toLowerCase() === 'capitalolondra';

    const [onlineUsers, setOnlineUsers] = useState([]);
    const [members, setMembers] = useState([]);
    const [savedContacts, setSavedContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [jumpLetter, setJumpLetter] = useState('');
    const [highlightedEmail, setHighlightedEmail] = useState(null);
    const highlightTimeoutRef = useRef(null);

    const onlineUsersRef = useRef([]);
    useEffect(() => { onlineUsersRef.current = onlineUsers; }, [onlineUsers]);

    const membersRef = useRef([]);
    useEffect(() => { membersRef.current = members; }, [members]);

    const [isOnlineExpanded, setIsOnlineExpanded] = useState(true);
    const [isMembersExpanded, setIsMembersExpanded] = useState(true);
    const [isContactsExpanded, setIsContactsExpanded] = useState(true);
    const [selectedContact, setSelectedContact] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // ✨ In-App Custom Notification State
    const [inAppNotif, setInAppNotif] = useState(null);

    // ✨ Vonage Call State
    const [vonageCallModal, setVonageCallModal] = useState(null);
    const [vonageMobileInput, setVonageMobileInput] = useState('');
    const [vonageCustomMessage, setVonageCustomMessage] = useState('');
    const [isVonageCalling, setIsVonageCalling] = useState(false);

    // Call Transcript State
    const [callTranscript, setCallTranscript] = useState([]);
    const [showTranscriptModal, setShowTranscriptModal] = useState(false);
    const [isSendingTranscript, setIsSendingTranscript] = useState(false);

    // ✨ AI Summary State
    const [transcriptSummary, setTranscriptSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);

    const callTranscriptRef = useRef([]);
    useEffect(() => { callTranscriptRef.current = callTranscript; }, [callTranscript]);

    // Modal & Current Mobile States
    const [currentUserMobile, setCurrentUserMobile] = useState(user?.user_metadata?.mobile || '');
    const [showMobileModal, setShowMobileModal] = useState(false);
    const [newMobile, setNewMobile] = useState('');
    const [isUpdatingMobile, setIsUpdatingMobile] = useState(false);

    // Edit Contact Mobile States (For capitalolondra only)
    const [editingContact, setEditingContact] = useState(null);
    const [editMobileValue, setEditMobileValue] = useState('');
    const [isSavingContactMobile, setIsSavingContactMobile] = useState(false);
    const [isFetchingContactMobile, setIsFetchingContactMobile] = useState(false);

    // CC, Translation & TTS States
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [spokenLang, setSpokenLang] = useState('en-US');
    const [targetLang, setTargetLang] = useState('es-ES');
    const [subtitles, setSubtitles] = useState({});

    // ✨ Local Translate Mode State
    const [showLocalTranslator, setShowLocalTranslator] = useState(false);
    const [isSendingLocalTranscript, setIsSendingLocalTranscript] = useState(false);
    const isLocalTranslateModeRef = useRef(false);
    useEffect(() => { isLocalTranslateModeRef.current = showLocalTranslator; }, [showLocalTranslator]);

    // Auto-enable state
    const [hasSavedSettings, setHasSavedSettings] = useState(false);

    // Text To Speech Toggle
    const [isTTSOn, setIsTTSOn] = useState(false);
    const isTTSOnRef = useRef(false);
    useEffect(() => { isTTSOnRef.current = isTTSOn; }, [isTTSOn]);

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const selectedContactRef = useRef(selectedContact);
    const channelRef = useRef(null);
    const autoJoinCallerRef = useRef(null);

    const [inVoiceCall, setInVoiceCall] = useState(false);
    const [activeCallEmails, setActiveCallEmails] = useState([]);
    const [incomingCall, setIncomingCall] = useState(null);
    const incomingCallRef = useRef(null);
    const [isCallingOut, setIsCallingOut] = useState(false);

    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const peersRef = useRef({});
    const pendingCandidatesRef = useRef({});
    const localStreamRef = useRef(null);

    // Translation, Scrolling, & Deepgram Refs
    const deepgramSocketRef = useRef(null);
    const ccMediaRecorderRef = useRef(null);
    const isTranscribingRef = useRef(false);
    const spokenLangRef = useRef('en-US');
    const targetLangRef = useRef('es-ES');
    const processSubtitleRef = useRef(null);
    const debounceTimers = useRef({});

    // ✨ Local Translator Scroll Ref
    const localTranslatorScrollRef = useRef(null);

    // ✨ Desktop Notification Status & Request
    const [notifPermission, setNotifPermission] = useState('default');

    useEffect(() => {
        if ('Notification' in window) {
            setNotifPermission(Notification.permission);
        }
    }, []);

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            alert('This browser does not support desktop notifications.');
            return;
        }
        try {
            const permission = await Notification.requestPermission();
            setNotifPermission(permission);
            if (permission === 'granted') {
                new Notification('Notifications enabled!', { body: 'You will now receive alerts for new messages.' });
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    };

    // Unlock audio context globally on first interaction so bell can play
    useEffect(() => {
        const unlockAudio = () => {
            ringer.unlock();
            document.removeEventListener('click', unlockAudio);
        };
        document.addEventListener('click', unlockAudio);
        return () => document.removeEventListener('click', unlockAudio);
    }, []);

    const notifyUser = (title, body) => {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            try {
                const notification = new Notification(title, { body });
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
            } catch (e) {
                console.error('Native notification failed', e);
            }
        }
    };

    useEffect(() => {
        if (localTranslatorScrollRef.current) {
            localTranslatorScrollRef.current.scrollTop = localTranslatorScrollRef.current.scrollHeight;
        }
    }, [callTranscript, subtitles, showLocalTranslator]);

    useEffect(() => { isTranscribingRef.current = isTranscribing; }, [isTranscribing]);
    useEffect(() => { spokenLangRef.current = spokenLang; }, [spokenLang]);
    useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);

    const chatContainerRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const inCallRef = useRef(false);
    const isEndingRef = useRef(false);
    const lastActionRef = useRef(0);

    // ==========================================
    // 💾 USER SETTINGS & PROFILE: LOAD & SAVE
    // ==========================================
    useEffect(() => {
        const loadSettingsAndProfile = async () => {
            if (!userEmail) return;

            const { data: settingsData } = await supabase
                .from('user_settings')
                .select('spoken_lang, target_lang')
                .eq('user_email', userEmail)
                .maybeSingle();

            if (settingsData) {
                if (settingsData.spoken_lang) setSpokenLang(settingsData.spoken_lang);
                if (settingsData.target_lang) setTargetLang(settingsData.target_lang);
                setHasSavedSettings(true);
            }

            try {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('mobile')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (profileData?.mobile) {
                    setCurrentUserMobile(profileData.mobile);
                }
            } catch (e) { }
        };
        loadSettingsAndProfile();
    }, [userEmail]);

    const saveUserSettings = async (newSpoken, newTarget) => {
        if (!userEmail) return;

        const { data, error } = await supabase.from('user_settings').upsert({
            user_email: userEmail,
            spoken_lang: newSpoken,
            target_lang: newTarget
        }, {
            onConflict: 'user_email'
        }).select();

        if (error) {
            console.error('Supabase Save Error:', error);
            alert(`⚠️ Supabase Error: Could not save settings!\n\nDetails: ${error.message}`);
        } else {
            setHasSavedSettings(true);
        }
    };

    useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    // ✨ URL INTERCEPTOR
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const caller = params.get('call_from');
        if (caller && userEmail) {
            setSelectedContact(caller);
            autoJoinCallerRef.current = caller;
            window.history.replaceState({}, document.title, "/");
        }
    }, [userEmail]);

    const METERED_USERNAME = "5e5e334296060e35c8d16fa0";
    const METERED_CREDENTIAL = "QB1S/xQpZ7Bq3llP";

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: ['turn:standard.relay.metered.ca:80', 'turn:standard.relay.metered.ca:443', 'turn:standard.relay.metered.ca:80?transport=tcp', 'turn:standard.relay.metered.ca:443?transport=tcp'], username: METERED_USERNAME, credential: METERED_CREDENTIAL }
        ],
        iceCandidatePoolSize: 10
    };

    useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

    useEffect(() => {
        if ((incomingCall || isCallingOut) && !ringer.isActive()) {
            ringer.start('incoming', () => {
                if (incomingCallRef.current) {
                    if (channelRef.current) {
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'webrtc-decline',
                            payload: { targetEmail: incomingCallRef.current.sender, sender: userEmail }
                        });
                    }
                    setIncomingCall(null);
                }
            });
        } else if (!incomingCall && !isCallingOut && ringer.isActive()) {
            ringer.stop();
        }
    }, [incomingCall, isCallingOut]);

    // ✨ Generate AI Summary Handler
    const handleGenerateSummary = async () => {
        if (callTranscript.length === 0) return;
        setIsSummarizing(true);
        try {
            const textToSummarize = callTranscript.map(e => `[${e.time}] ${e.sender === userEmail ? 'You' : e.sender}: ${e.original} (Translated: ${e.translated})`).join('\n');
            const { data, error } = await supabase.functions.invoke('ai-summary', {
                body: { transcript: textToSummarize }
            });

            if (error) {
                let actualErrorMessage = error.message;
                if (error.context && typeof error.context.json === 'function') {
                    try {
                        const errorBody = await error.context.json();
                        actualErrorMessage = errorBody.error || errorBody.message || actualErrorMessage;
                    } catch (e) { }
                }
                throw new Error(actualErrorMessage);
            }

            if (data && data.summary) {
                setTranscriptSummary(data.summary);
            } else {
                throw new Error("No summary returned");
            }
        } catch (err) {
            alert('Failed to generate summary: ' + err.message);
        } finally {
            setIsSummarizing(false);
        }
    };

    useEffect(() => {
        supabase.from('auth').select('email, name').then(({ data, error }) => {
            if (error) console.error("Error loading auth members:", error);
            if (data) setMembers(data);
        });

        const stored = localStorage.getItem('totalRecallContacts');
        if (stored) try { setSavedContacts(JSON.parse(stored)); } catch (e) { }

        const pc = supabase.channel('public:auth').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auth' }, p => {
            setMembers(prev => prev.find(m => m.email === p.new.email) ? prev : [...prev, { name: p.new.name || p.new.email.split('@')[0], email: p.new.email }]);
        }).subscribe();

        return () => { supabase.removeChannel(pc); };
    }, []);

    useEffect(() => { if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }, [chatMessages]);
    useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

    useEffect(() => {
        if (!selectedContact || !userEmail) return;
        Promise.all([
            supabase.from('messages').select('*').eq('sender_email', userEmail).eq('receiver_email', selectedContact).limit(50),
            supabase.from('messages').select('*').eq('sender_email', selectedContact).eq('receiver_email', userEmail).limit(50)
        ]).then(([s, r]) => setChatMessages([...(s.data || []), ...(r.data || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))));
    }, [selectedContact, userEmail]);

    const broadcastLanguageChange = (newSpoken, newTarget) => {
        if (inCallRef.current && channelRef.current) {
            Object.keys(peersRef.current).forEach(peer => {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-language-update',
                    payload: { targetEmail: peer, sender: userEmail, spokenLang: newSpoken, targetLang: newTarget }
                });
            });
        }
    };

    const toggleTTS = () => {
        const nextState = !isTTSOn;
        setIsTTSOn(nextState);
        if (inCallRef.current && channelRef.current) {
            Object.keys(peersRef.current).forEach(peer => {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-tts-sync',
                    payload: { targetEmail: peer, sender: userEmail, isTTSOn: nextState }
                });
            });
        }
    };

    const handleImportContacts = async () => {
        if (isImporting) return;
        setIsImporting(true);
        try {
            const supported = ('contacts' in navigator && 'ContactsManager' in window);
            let contactsToProcess = [];

            if (supported) {
                try {
                    const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true });
                    contacts.forEach(c => {
                        if (c.email && c.email.length > 0) {
                            contactsToProcess.push({ name: c.name?.[0] || c.email[0].split('@')[0], email: c.email[0].trim(), type: 'email' });
                        } else if (c.tel && c.tel.length > 0) {
                            const cleanNum = c.tel[0].replace(/[^0-9]/g, '');
                            if (cleanNum.length >= 5) {
                                contactsToProcess.push({ name: c.name?.[0] || cleanNum, email: cleanNum, type: 'tel' });
                            }
                        }
                    });
                } catch (err) { alert("Contact selection was cancelled."); setIsImporting(false); return; }
            } else {
                const input = prompt("Enter an email address OR a mobile number (include country code, e.g. 44 for UK) to send an invite:");
                if (!input || !input.trim()) { setIsImporting(false); return; }
                const trimmed = input.trim();

                let contactName = "";
                if (trimmed.includes('@')) {
                    contactName = prompt("Enter a name for this contact:") || trimmed.split('@')[0];
                    contactsToProcess = [{ name: contactName.trim(), email: trimmed, type: 'email' }];
                } else {
                    const cleanNum = trimmed.replace(/[^0-9]/g, '');
                    if (cleanNum.length >= 5) {
                        contactName = prompt("Enter a name for this contact (Required):");
                        if (!contactName || !contactName.trim()) {
                            alert("A name is required when adding a mobile number.");
                            setIsImporting(false);
                            return;
                        }
                        contactsToProcess = [{ name: contactName.trim(), email: cleanNum, type: 'tel' }];
                    } else {
                        alert("Please enter a valid email address or mobile number.");
                        setIsImporting(false); return;
                    }
                }
            }

            if (contactsToProcess.length === 0) { setIsImporting(false); return; }
            const existingEmails = new Set(savedContacts.map(c => c.email?.trim().toLowerCase()));
            const contactsToAdd = [], contactsAlreadyExist = [];

            contactsToProcess.forEach(contact => {
                if (existingEmails.has(contact.email.toLowerCase())) contactsAlreadyExist.push(contact);
                else contactsToAdd.push(contact);
            });

            if (contactsToAdd.length > 0) {
                setSavedContacts(prev => {
                    const mapped = contactsToAdd.map(c => ({ name: c.name, email: c.email }));
                    const merged = [...prev, ...mapped];
                    localStorage.setItem('totalRecallContacts', JSON.stringify(merged));
                    return merged;
                });
            }

            const allContactsToEmail = [...contactsToAdd, ...contactsAlreadyExist];
            if (allContactsToEmail.length > 0) {
                let sentCount = 0;
                for (const contact of allContactsToEmail) {
                    try {
                        if (contact.type === 'email' || contact.email.includes('@')) {
                            const { error } = await supabase.functions.invoke('send-email', {
                                body: { to: contact.email, subject: `📱 ${displayName} wants to connect on TotalRecall!` }
                            });
                            if (!error) sentCount++;
                        } else {
                            const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                                ? 'https://totalrecall.network'
                                : window.location.origin;
                            const joinLink = `${BASE_URL}`;
                            const { error } = await supabase.functions.invoke('vonage-invite', {
                                body: {
                                    to: contact.email,
                                    inviterEmail: userEmail,
                                    inviterName: displayName,
                                    joinLink: joinLink
                                }
                            });
                            if (!error) sentCount++;
                        }
                    } catch (error) { console.error(error); }
                }
                alert(`${t('add', uiLanguage)} ${contactsToAdd.length}. Sent ${sentCount} invite(s).`);
            } else alert("All contacts already in list.");
        } finally { setIsImporting(false); }
    };

    const handleRemoveContact = (e, emailToRemove) => {
        e.stopPropagation();
        if (window.confirm('Remove this contact?')) {
            setSavedContacts(prev => {
                const updated = prev.filter(c => c.email !== emailToRemove);
                localStorage.setItem('totalRecallContacts', JSON.stringify(updated));
                return updated;
            });
            if (selectedContact === emailToRemove) setSelectedContact(null);
        }
    };

    const handleUpdateMobile = async () => {
        if (!newMobile.trim()) {
            alert("Please enter a valid mobile number.");
            return;
        }
        setIsUpdatingMobile(true);
        try {
            const trimmedMobile = newMobile.trim();
            await supabase.auth.updateUser({ data: { mobile: trimmedMobile } });

            const { data: updateData, error: updateError } = await supabase
                .from('profiles')
                .update({ mobile: trimmedMobile })
                .eq('email', userEmail)
                .select();

            if (updateError) throw updateError;

            if (!updateData || updateData.length === 0) {
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{ email: userEmail, mobile: trimmedMobile, name: displayName }]);
                if (insertError) throw insertError;
            }

            alert("Mobile number updated successfully!");
            setCurrentUserMobile(trimmedMobile);
            setShowMobileModal(false);
            setNewMobile('');
        } catch (err) {
            if (err.message.includes('permission denied') || err.code === '42501') {
                alert("Notice: Mobile number saved to your account successfully, but it was blocked from saving to the public 'profiles' directory due to database security policies (RLS).");
                setCurrentUserMobile(newMobile.trim());
                setShowMobileModal(false);
                setNewMobile('');
            } else {
                alert("Failed to update mobile number: " + err.message);
            }
        } finally {
            setIsUpdatingMobile(false);
        }
    };

    const handleEditContactMobileClick = (e, emailToEdit, contactType) => {
        e.stopPropagation();
        setEditingContact({ email: emailToEdit, type: contactType });

        if (!emailToEdit.includes('@') && contactType === 'contact') {
            setEditMobileValue(emailToEdit);
            setIsFetchingContactMobile(false);
        } else {
            setEditMobileValue('');
            setIsFetchingContactMobile(true);

            const fetchMobile = async () => {
                let foundMobile = '';
                try {
                    const { data: pData } = await supabase.from('profiles').select('mobile').eq('email', emailToEdit).maybeSingle();
                    if (pData?.mobile) foundMobile = pData.mobile;
                } catch (error) {
                    console.error("Error fetching mobile:", error);
                }

                setEditMobileValue(foundMobile);
                setIsFetchingContactMobile(false);
            };
            fetchMobile();
        }
    };

    const getMedia = async () => {
        try {
            return await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
                audio: true
            });
        } catch (err) {
            console.warn("Video+Audio request failed. Falling back to Audio only...", err);
            return await navigator.mediaDevices.getUserMedia({ audio: true });
        }
    };

    const broadcastMeshState = () => {
        if (!inCallRef.current || !channelRef.current) return;
        const connectedPeers = Object.keys(peersRef.current).filter(e => peersRef.current[e].connectionState === 'connected');
        connectedPeers.forEach(target => {
            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-mesh-sync',
                payload: { targetEmail: target, peers: connectedPeers, sender: userEmail }
            });
        });
    };

    const createPC = (email) => {
        if (peersRef.current[email]) peersRef.current[email].close();
        const pc = new RTCPeerConnection(rtcConfig);
        peersRef.current[email] = pc;
        setActiveCallEmails(prev => [...new Set([...prev, email])]);
        if (!pendingCandidatesRef.current[email]) pendingCandidatesRef.current[email] = [];

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
        }

        pc.onicecandidate = (e) => {
            if (e.candidate && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-ice',
                    payload: { targetEmail: email, candidate: { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex, usernameFragment: e.candidate.usernameFragment }, sender: userEmail }
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') { setIsCallingOut(false); broadcastMeshState(); }
            else if (pc.connectionState === 'failed') cleanPeer(email);
            else if (pc.connectionState === 'disconnected') setTimeout(() => { if (peersRef.current[email]?.connectionState === 'disconnected') cleanPeer(email); }, 5000);
        };

        pc.ontrack = (event) => {
            setRemoteStreams(prev => {
                const existingStream = prev[email];
                if (existingStream) {
                    if (!existingStream.getTracks().find(t => t.id === event.track.id)) {
                        existingStream.addTrack(event.track);
                    }
                    return { ...prev };
                }
                if (event.streams && event.streams.length > 0) {
                    return { ...prev, [email]: event.streams[0] };
                } else {
                    const newStream = new MediaStream([event.track]);
                    return { ...prev, [email]: newStream };
                }
            });
        };
        return pc;
    };

    const cleanPeer = (email) => {
        if (peersRef.current[email]) {
            peersRef.current[email].close();
            delete peersRef.current[email];
        }
        setRemoteStreams(prev => { const n = { ...prev }; delete n[email]; return n; });
        setActiveCallEmails(prev => prev.filter(e => e !== email));
        delete pendingCandidatesRef.current[email];

        if (!Object.keys(peersRef.current).length && inCallRef.current && !isEndingRef.current) {
            endCall(false);
        } else if (inCallRef.current) {
            broadcastMeshState();
        }
    };

    const endCall = (broadcast = true) => {
        if (isEndingRef.current) return;
        isEndingRef.current = true;
        inCallRef.current = false;

        if (ringer.isActive()) ringer.stop();

        setIsCallingOut(false);
        setIsScreenSharing(false);
        setIsMuted(false);
        setIsVideoOff(false);
        setIncomingCall(null);

        stopCC();

        if (broadcast) {
            Object.keys(peersRef.current).forEach(email => {
                if (channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'webrtc-end',
                        payload: { targetEmail: email, sender: userEmail }
                    });
                }
            });
        }

        Object.values(peersRef.current).forEach(pc => {
            try { pc.close(); } catch (e) { }
        });

        peersRef.current = {};
        pendingCandidatesRef.current = {};
        setRemoteStreams({});
        setActiveCallEmails([]);

        setTimeout(() => {
            if (!inCallRef.current && localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
                setLocalStream(null);
            }
        }, 2000);

        setInVoiceCall(false);

        if (callTranscriptRef.current.length > 0) {
            setShowTranscriptModal(true);
        }

        setTimeout(() => { isEndingRef.current = false; }, 1000);
    };

    const startWebRTCCall = async (email, isAuto = false) => {
        if (!channelRef.current) return;
        inCallRef.current = true;
        setCallTranscript([]);
        setTranscriptSummary('');
        setShowTranscriptModal(false);
        if (!isAuto) setIsCallingOut(true);

        try {
            if (!localStreamRef.current) { const s = await getMedia(); localStreamRef.current = s; setLocalStream(s); }
            const pc = createPC(email);
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);

            const isT = isTranscribingRef.current || hasSavedSettings;

            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-offer',
                payload: {
                    targetEmail: email,
                    offer: pc.localDescription,
                    sender: userEmail,
                    isAuto,
                    isTranscribing: isT,
                    spokenLang: spokenLangRef.current,
                    targetLang: targetLangRef.current,
                    isTTSOn: isTTSOnRef.current
                }
            });
            setInVoiceCall(true);
        } catch (err) {
            if (!isAuto) alert("Call failed: " + err.message);
            if (Object.keys(peersRef.current).length === 0) endCall(false);
            else { if (!isAuto) setIsCallingOut(false); cleanPeer(email); }
        }
    };

    const prepareVonageCall = async (emailToCall) => {
        let targetMobile = null;

        if (emailToCall && !emailToCall.includes('@') && /^\d+$/.test(emailToCall.replace(/[^0-9]/g, ''))) {
            targetMobile = emailToCall.replace(/[^0-9]/g, '');
        }

        if (!targetMobile) {
            try {
                const { data: profileData } = await supabase.from('profiles').select('mobile').eq('email', emailToCall).maybeSingle();
                if (profileData?.mobile) targetMobile = profileData.mobile;
            } catch (e) { }
        }

        setVonageMobileInput(targetMobile || '');
        setVonageCustomMessage(`Hi, ${displayName} is calling you on TotalRecall. Please join the chat.`);
        setVonageCallModal({ email: emailToCall });
    };

    const executeVonageCall = async () => {
        const cleanNumber = vonageMobileInput.replace(/[^0-9]/g, '');
        if (!cleanNumber || cleanNumber.length < 5) {
            alert("Please provide a valid phone number.");
            return;
        }

        setIsVonageCalling(true);
        try {
            const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'https://totalrecall.network'
                : window.location.origin;

            const joinLink = `${BASE_URL}/?call_from=${encodeURIComponent(userEmail)}`;

            const customTxt = vonageCustomMessage.trim();
            const { data, error } = await supabase.functions.invoke('vonage-call', {
                body: {
                    to: cleanNumber,
                    callerEmail: userEmail,
                    callerName: displayName,
                    joinLink: joinLink,
                    message: customTxt,
                    text: customTxt,
                    customMessage: customTxt
                }
            });

            if (error) throw new Error(error.message);

            if (vonageCallModal && vonageCallModal.email && customTxt) {
                const { data: msgData, error: msgError } = await supabase
                    .from('messages')
                    .insert([{
                        sender_email: userEmail,
                        receiver_email: vonageCallModal.email,
                        text: customTxt
                    }])
                    .select();

                if (!msgError && msgData?.length) {
                    setChatMessages(prev => prev.find(m => m.id === msgData[0].id) ? prev : [...prev, msgData[0]]);
                }
            }

            alert(`Call alerting and SMS invite sent to ${cleanNumber}. They will join this chat window shortly.`);

            if (!inCallRef.current) {
                startWebRTCCall(vonageCallModal.email, true);
            }
            setVonageCallModal(null);
        } catch (err) {
            console.error("Mobile call initiation failed:", err);
            alert(`Call failed. Details: ${err.message}`);
        } finally {
            setIsVonageCalling(false);
        }
    };

    const initiateCall = async (email, isAuto = false) => {
        if (!isAuto) {
            if (Date.now() - lastActionRef.current < 2000) return;
            lastActionRef.current = Date.now();

            const isOnline = onlineUsersRef.current.some(u => u.email?.toLowerCase() === email.toLowerCase());

            if (!isOnline) {
                await prepareVonageCall(email);
                return;
            }
        }
        startWebRTCCall(email, isAuto);
    };

    const handleVonageMobileCallUI = () => {
        if (selectedContact) prepareVonageCall(selectedContact);
    };

    const autoAcceptCall = async (call) => {
        setCallTranscript([]);
        setTranscriptSummary('');
        setShowTranscriptModal(false);
        try {
            if (!localStreamRef.current) { const s = await getMedia(); localStreamRef.current = s; setLocalStream(s); }
            const pc = createPC(call.sender);
            await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
            const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(answer);
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-answer',
                    payload: { targetEmail: call.sender, answer: pc.localDescription, sender: userEmail }
                });
            }
            const pending = pendingCandidatesRef.current[call.sender] || [];
            for (const c of pending) { try { await pc.addIceCandidate(c); } catch (e) { } }
            pendingCandidatesRef.current[call.sender] = [];

            if (call.isTranscribing && !isTranscribingRef.current) {
                setIsTranscribing(true);
                startCC();
            }
        } catch (err) { cleanPeer(call.sender); }
    };

    const acceptIncoming = async () => {
        const call = incomingCallRef.current;
        if (!call) return;
        if (Date.now() - lastActionRef.current < 2000) return;
        lastActionRef.current = Date.now();
        inCallRef.current = true;
        setCallTranscript([]);
        setTranscriptSummary('');
        setShowTranscriptModal(false);
        if (ringer.isActive()) ringer.stop();
        setIncomingCall(null);

        try {
            if (!localStreamRef.current) { const s = await getMedia(); localStreamRef.current = s; setLocalStream(s); }
            const pc = createPC(call.sender);
            await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
            const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(answer);
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-answer',
                    payload: { targetEmail: call.sender, answer: pc.localDescription, sender: userEmail }
                });
            }
            const pending = pendingCandidatesRef.current[call.sender] || [];
            for (const c of pending) { try { await pc.addIceCandidate(c); } catch (e) { } }
            pendingCandidatesRef.current[call.sender] = [];
            setInVoiceCall(true);
            setSelectedContact(call.sender);

            if (call.isTranscribing && !isTranscribingRef.current) {
                setIsTranscribing(true);
                startCC();
            }
        } catch (err) {
            alert("Accept failed: " + err.message);
            if (Object.keys(peersRef.current).length === 0) endCall(false);
            else cleanPeer(call.sender);
        }
    };

    const toggleScreenShare = async () => {
        if (!localStreamRef.current || !inCallRef.current) return;
        try {
            if (isScreenSharing) {
                const newCameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } });
                const newVideoTrack = newCameraStream.getVideoTracks()[0];
                if (isVideoOff) newVideoTrack.enabled = false;
                Object.values(peersRef.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) sender.replaceTrack(newVideoTrack);
                });
                const currentAudioTrack = localStreamRef.current.getAudioTracks()[0];
                const newStream = new MediaStream([newVideoTrack]);
                if (currentAudioTrack) newStream.addTrack(currentAudioTrack);
                localStreamRef.current.getVideoTracks().forEach(t => t.stop());
                localStreamRef.current = newStream;
                setLocalStream(newStream);
                setIsScreenSharing(false);
            } else {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenVideoTrack = screenStream.getVideoTracks()[0];
                screenVideoTrack.onended = () => { if (inCallRef.current) toggleScreenShare(); };
                Object.values(peersRef.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) sender.replaceTrack(screenVideoTrack);
                });
                const currentAudioTrack = localStreamRef.current.getAudioTracks()[0];
                const newStream = new MediaStream([screenVideoTrack]);
                if (currentAudioTrack) newStream.addTrack(currentAudioTrack);
                localStreamRef.current.getVideoTracks().forEach(t => t.stop());
                localStreamRef.current = newStream;
                setLocalStream(newStream);
                setIsScreenSharing(true);
            }
        } catch (err) { console.error("Screen share error:", err); }
    };

    const toggleMute = () => {
        if (!localStreamRef.current) return;
        const audioTracks = localStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
            const isCurrentlyEnabled = audioTracks[0].enabled;
            audioTracks.forEach(track => { track.enabled = !isCurrentlyEnabled; });
            setIsMuted(isCurrentlyEnabled);
        }
    };

    const toggleCamera = () => {
        if (!localStreamRef.current) return;
        if (isScreenSharing) { alert("Stop screen sharing first."); return; }
        const videoTracks = localStreamRef.current.getVideoTracks();
        if (videoTracks.length > 0) {
            const isCurrentlyEnabled = videoTracks[0].enabled;
            videoTracks.forEach(track => { track.enabled = !isCurrentlyEnabled; });
            setIsVideoOff(isCurrentlyEnabled);
        }
    };

    const decline = () => {
        if (ringer.isActive()) ringer.stop();
        const call = incomingCallRef.current;
        if (call && channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-decline',
                payload: { targetEmail: call.sender, sender: userEmail }
            });
        }
        setIncomingCall(null);
    };

    const translateText = async (text, sourceLang, targetLang) => {
        if (!text || !text.trim()) return text;
        const sourceBase = sourceLang.startsWith('zh') ? sourceLang : sourceLang.split('-')[0];
        const targetBase = targetLang.startsWith('zh') ? targetLang : targetLang.split('-')[0];
        if (sourceBase === targetBase) return text;

        const cacheKey = `${sourceBase}-${targetBase}-${text.trim()}`;
        if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceBase}&tl=${targetBase}&dt=t&q=${encodeURIComponent(text.trim())}`);
            if (!res.ok) throw new Error('Google Translation API failed');
            const data = await res.json();
            const translated = data[0].map(item => item[0]).join('');
            translationCache.set(cacheKey, translated);
            return translated;
        } catch (e) {
            console.error("Google Translation API error, attempting fallback:", e);
            try {
                const res2 = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${sourceBase}|${targetBase}`);
                const data2 = await res2.json();
                if (data2.responseData?.translatedText) {
                    const tText = data2.responseData.translatedText;
                    if (!tText.includes("MYMEMORY WARNING") && !tText.includes("PLEASE SELECT TWO DISTINCT LANGUAGES")) {
                        translationCache.set(cacheKey, tText);
                        return tText;
                    }
                }
            } catch (fallbackErr) {
                console.error("Fallback Translation API failed:", fallbackErr);
            }
            return text;
        }
    };

    const startCC = async (isReconnect = false) => {
        if (isTranscribingRef.current && !isReconnect) return;

        const DEEPGRAM_API_KEY = '6fad18b20b8cb263a38d87b7e4d4045d71acad96';

        if (!isReconnect) {
            setIsTranscribing(true);
            isTranscribingRef.current = true;
        }

        const langMap = {
            'en-US': 'en', 'es-ES': 'es', 'fr-FR': 'fr', 'de-DE': 'de', 'it-IT': 'it',
            'zh-CN': 'zh', 'ja-JP': 'ja', 'pt-PT': 'pt', 'pt-BR': 'pt', 'el-GR': 'el',
            'ru-RU': 'ru', 'yo-NG': 'yo', 'pl-PL': 'pl'
        };
        const dgLang = langMap[spokenLangRef.current] || 'en';

        try {
            let stream;
            if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
                stream = new MediaStream([localStreamRef.current.getAudioTracks()[0]]);
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            if (ccMediaRecorderRef.current && ccMediaRecorderRef.current.state !== 'inactive') {
                try { ccMediaRecorderRef.current.stop(); } catch (e) { }
            }

            ccMediaRecorderRef.current = new MediaRecorder(stream);

            let keepAliveInterval;
            const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?model=nova-3&language=${dgLang}&interim_results=true`, ['token', DEEPGRAM_API_KEY]);
            deepgramSocketRef.current = socket;

            socket.onopen = () => {
                ccMediaRecorderRef.current.addEventListener('dataavailable', event => {
                    if (event.data.size > 0 && socket.readyState === 1) {
                        socket.send(event.data);
                    }
                });
                ccMediaRecorderRef.current.start(250);

                keepAliveInterval = setInterval(() => {
                    if (socket.readyState === 1) {
                        socket.send(JSON.stringify({ type: 'KeepAlive' }));
                    }
                }, 5000);
            };

            socket.onmessage = (message) => {
                const received = JSON.parse(message.data);
                const transcript = received.channel?.alternatives[0]?.transcript;

                if (transcript) {
                    const payload = { sender: userEmail, text: transcript, lang: spokenLangRef.current, isFinal: received.is_final };

                    if (processSubtitleRef.current) processSubtitleRef.current(payload);

                    if (channelRef.current && inCallRef.current) {
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'webrtc-subtitle',
                            payload
                        });
                    }
                }
            };

            socket.onerror = (error) => {
                console.error("Deepgram WebSocket Error:", error);
            };

            socket.onclose = () => {
                if (keepAliveInterval) clearInterval(keepAliveInterval);
                if (isTranscribingRef.current) {
                    setTimeout(() => {
                        if (isTranscribingRef.current) startCC(true);
                    }, 1000);
                }
            };

        } catch (err) {
            console.error("Microphone access denied or error:", err);
            if (!isReconnect) {
                setIsTranscribing(false);
                isTranscribingRef.current = false;
            }
        }
    };

    const stopCC = () => {
        setIsTranscribing(false);
        isTranscribingRef.current = false;

        if (ccMediaRecorderRef.current && ccMediaRecorderRef.current.state !== 'inactive') {
            try { ccMediaRecorderRef.current.stop(); } catch (e) { }
            ccMediaRecorderRef.current.stream.getTracks().forEach(track => {
                const isMainTrack = localStreamRef.current?.getTracks().includes(track);
                if (!isMainTrack) {
                    track.stop();
                }
            });
        }

        if (deepgramSocketRef.current) {
            deepgramSocketRef.current.close();
            deepgramSocketRef.current = null;
        }

        setSubtitles({});
        if (channelRef.current && inCallRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-subtitle',
                payload: { sender: userEmail, text: '', lang: spokenLangRef.current, isFinal: true, clear: true }
            });
        }
    };

    const toggleTranscription = () => {
        if (isTranscribingRef.current) {
            stopCC();
            if (inCallRef.current && channelRef.current) {
                Object.keys(peersRef.current).forEach(peer => {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'webrtc-transcribe-off',
                        payload: { targetEmail: peer, sender: userEmail }
                    });
                });
            }
        } else {
            startCC();
            if (inCallRef.current && channelRef.current) {
                Object.keys(peersRef.current).forEach(peer => {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'webrtc-transcribe-on',
                        payload: { targetEmail: peer, sender: userEmail }
                    });
                });
            }
        }
    };

    const swapLanguages = () => {
        const newSpoken = targetLang;
        const newTarget = spokenLang;
        setSpokenLang(newSpoken);
        setTargetLang(newTarget);
        spokenLangRef.current = newSpoken;
        targetLangRef.current = newTarget;
        saveUserSettings(newSpoken, newTarget);
        broadcastLanguageChange(newSpoken, newTarget);

        if (isTranscribingRef.current) {
            stopCC();
            setTimeout(() => {
                startCC();
            }, 300);
        }
    };

    const autoStartedRef = useRef(false);
    useEffect(() => {
        if (inVoiceCall && hasSavedSettings && !autoStartedRef.current) {
            if (!isTranscribingRef.current) {
                setIsTranscribing(true);
                startCC();
            }
            autoStartedRef.current = true;
        } else if (!inVoiceCall) {
            autoStartedRef.current = false;
        }
    }, [inVoiceCall, hasSavedSettings]);

    useEffect(() => {
        processSubtitleRef.current = async (payload) => {
            const { sender, text, lang, isFinal, clear } = payload;

            if (!inCallRef.current && !isLocalTranslateModeRef.current) return;

            if (clear) {
                setSubtitles(prev => { const n = { ...prev }; delete n[sender]; return n; });
                return;
            }

            const translateToLang = sender === userEmail ? targetLangRef.current : spokenLangRef.current;
            const sourceBase = lang.startsWith('zh') ? lang : lang.split('-')[0];
            const targetBase = translateToLang.startsWith('zh') ? translateToLang : translateToLang.split('-')[0];
            const needsTranslation = (sourceBase !== targetBase);

            setSubtitles(prev => ({
                ...prev,
                [sender]: {
                    original: text,
                    translated: needsTranslation ? (prev[sender]?.translated || '...') : text,
                    isFinal
                }
            }));

            if (needsTranslation && text.trim().length > 0) {
                const doTranslate = () => {
                    translateText(text, lang, translateToLang).then(translated => {
                        setSubtitles(prev => {
                            if (prev[sender]) {
                                return { ...prev, [sender]: { ...prev[sender], translated, isFinal } };
                            }
                            return prev;
                        });

                        if (isFinal) {
                            setCallTranscript(prev => {
                                const isDup = prev.length > 0 && prev[prev.length - 1].original === text && prev[prev.length - 1].sender === sender;
                                if (isDup) return prev;
                                return [...prev, { sender, original: text, translated, time: new Date().toLocaleTimeString() }];
                            });
                        }

                        const shouldSpeak = (sender !== userEmail) || isLocalTranslateModeRef.current;
                        if (isFinal && shouldSpeak && isTTSOnRef.current && 'speechSynthesis' in window) {
                            const utterance = new SpeechSynthesisUtterance(translated || text);
                            utterance.lang = translateToLang;
                            window.speechSynthesis.speak(utterance);
                        }
                    });
                };

                const now = Date.now();
                const lastTime = lastTranslationTime[sender] || 0;

                if (isFinal) {
                    clearTimeout(debounceTimers.current[sender]);
                    doTranslate();
                    lastTranslationTime[sender] = now;
                } else {
                    if (now - lastTime > 1500) {
                        doTranslate();
                        lastTranslationTime[sender] = now;
                    }
                    clearTimeout(debounceTimers.current[sender]);
                    debounceTimers.current[sender] = setTimeout(() => {
                        doTranslate();
                        lastTranslationTime[sender] = Date.now();
                    }, 800);
                }
            } else if (!needsTranslation && isFinal && text.trim().length > 0) {
                setCallTranscript(prev => {
                    const isDup = prev.length > 0 && prev[prev.length - 1].original === text && prev[prev.length - 1].sender === sender;
                    if (isDup) return prev;
                    return [...prev, { sender, original: text, translated: text, time: new Date().toLocaleTimeString() }];
                });

                if (isTTSOnRef.current && 'speechSynthesis' in window) {
                    const shouldSpeak = (sender !== userEmail) || isLocalTranslateModeRef.current;
                    if (shouldSpeak) {
                        const utterance = new SpeechSynthesisUtterance(text);
                        utterance.lang = translateToLang;
                        window.speechSynthesis.speak(utterance);
                    }
                }
            }

            if (isFinal) {
                setTimeout(() => {
                    setSubtitles(curr => curr[sender]?.original === text ? { ...curr, [sender]: null } : curr);
                }, 6000);
            }
        };
    }, [userEmail]);

    useEffect(() => {
        if (!userEmail) return;
        const ch = supabase.channel('totalrecall-global', { config: { presence: { key: `u_${userEmail}` } } });
        channelRef.current = ch;

        ch.on('presence', { event: 'sync' }, () => {
            const st = ch.presenceState();
            const users = [];
            for (const k in st) {
                const p = st[k]?.[0];
                if (p?.email && p.email !== userEmail && !users.find(u => u.email === p.email)) users.push({ email: p.email });
            }
            setOnlineUsers(users);
        });

        // ✨ UPDATED ALERTS & NOTIFICATION LOGIC
        ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
            const isForMe = p.new.receiver_email?.toLowerCase() === userEmail.toLowerCase();
            const isFromMe = p.new.sender_email?.toLowerCase() === userEmail.toLowerCase();

            const selectedEmail = selectedContactRef.current?.toLowerCase() || '';
            const isFromSelected = p.new.sender_email?.toLowerCase() === selectedEmail;
            const isToSelected = p.new.receiver_email?.toLowerCase() === selectedEmail;

            if (isForMe && !isFromMe) {
                // Play notification bell
                ringer.playBell();

                const isHidden = document.hidden || document.visibilityState === 'hidden';

                if (isHidden || !isFromSelected) {
                    const senderName = p.new.sender_email.split('@')[0];
                    let msgPreview = p.new.text || '';
                    if (msgPreview.startsWith('[VOICE]')) msgPreview = '🎤 Voice message';
                    if (msgPreview.startsWith('[IMAGE]')) msgPreview = '📷 Image';

                    // Trigger Native
                    notifyUser(`New message from ${senderName}`, msgPreview);

                    // ✨ Trigger In-App Custom Toast (Ensures it works even if Native blocks)
                    setInAppNotif({ email: p.new.sender_email, sender: senderName, text: msgPreview });
                    setTimeout(() => setInAppNotif(null), 5000); // Auto hide after 5 seconds

                    // Flash document title
                    const originalTitle = "TotalRecall";
                    document.title = `💬 New Message!`;
                    setTimeout(() => {
                        document.title = originalTitle;
                    }, 4000);
                }
            }

            if ((isFromSelected && isForMe) || (isFromMe && isToSelected)) {
                setChatMessages(prev => prev.find(m => m.id === p.new.id) ? prev : [...prev, p.new]);
            }
        });

        ch.on('broadcast', { event: 'webrtc-subtitle' }, ({ payload }) => {
            if (payload.sender !== userEmail && processSubtitleRef.current) {
                processSubtitleRef.current(payload);
            }
        });

        ch.on('broadcast', { event: 'webrtc-transcribe-on' }, ({ payload }) => {
            if (payload.targetEmail === userEmail && inCallRef.current && !isTranscribingRef.current) {
                setIsTranscribing(true);
                startCC();
            }
        });

        ch.on('broadcast', { event: 'webrtc-transcribe-off' }, ({ payload }) => {
            if (payload.targetEmail === userEmail && inCallRef.current && isTranscribingRef.current) {
                stopCC();
            }
        });

        ch.on('broadcast', { event: 'webrtc-language-update' }, ({ payload }) => {
            if (payload.targetEmail === userEmail && inCallRef.current) {
                const newSpoken = payload.targetLang;
                const newTarget = payload.spokenLang;

                setSpokenLang(newSpoken);
                setTargetLang(newTarget);
                spokenLangRef.current = newSpoken;
                targetLangRef.current = newTarget;
                saveUserSettings(newSpoken, newTarget);

                if (isTranscribingRef.current) {
                    stopCC();
                    setTimeout(() => {
                        startCC();
                    }, 300);
                }
            }
        });

        ch.on('broadcast', { event: 'webrtc-tts-sync' }, ({ payload }) => {
            if (payload.targetEmail === userEmail && inCallRef.current) {
                setIsTTSOn(payload.isTTSOn);
            }
        });

        ch.on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;

            if (payload.spokenLang && payload.targetLang) {
                const newSpoken = payload.targetLang;
                const newTarget = payload.spokenLang;
                setSpokenLang(newSpoken);
                setTargetLang(newTarget);
                spokenLangRef.current = newSpoken;
                targetLangRef.current = newTarget;
                saveUserSettings(newSpoken, newTarget);
            }

            if (payload.isTTSOn !== undefined) {
                setIsTTSOn(payload.isTTSOn);
            }

            if (peersRef.current[payload.sender]) {
                try {
                    await peersRef.current[payload.sender].setRemoteDescription(new RTCSessionDescription(payload.offer));
                    const ans = await peersRef.current[payload.sender].createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                    await peersRef.current[payload.sender].setLocalDescription(ans);
                    ch.send({ type: 'broadcast', event: 'webrtc-answer', payload: { targetEmail: payload.sender, answer: ans, sender: userEmail } });
                } catch (e) { }
                return;
            }
            if (inCallRef.current) autoAcceptCall(payload);
            else setIncomingCall(payload);
        });

        ch.on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;
            setIsCallingOut(false);
            const pc = peersRef.current[payload.sender];
            if (pc && pc.signalingState === 'have-local-offer') {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    const pending = pendingCandidatesRef.current[payload.sender] || [];
                    for (const c of pending) { try { await pc.addIceCandidate(c); } catch (e) { } }
                    pendingCandidatesRef.current[payload.sender] = [];
                } catch (e) { }
            }
        });

        ch.on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;
            const candidateData = payload.candidate;
            const pc = peersRef.current[payload.sender];
            const candidate = new RTCIceCandidate({ candidate: candidateData.candidate, sdpMid: candidateData.sdpMid, sdpMLineIndex: candidateData.sdpMLineIndex, usernameFragment: candidateData.usernameFragment });
            if (pc?.remoteDescription) { try { await pc.addIceCandidate(candidate); } catch (e) { } }
            else {
                if (!pendingCandidatesRef.current[payload.sender]) pendingCandidatesRef.current[payload.sender] = [];
                pendingCandidatesRef.current[payload.sender].push(candidate);
            }
        });

        ch.on('broadcast', { event: 'webrtc-mesh-sync' }, ({ payload }) => {
            if (payload.targetEmail !== userEmail || !inCallRef.current) return;
            payload.peers.forEach(peer => {
                if (peer !== userEmail && !peersRef.current[peer]) {
                    if (userEmail.toLowerCase() < peer.toLowerCase()) startWebRTCCall(peer, true);
                }
            });
        });

        ch.on('broadcast', { event: 'webrtc-decline' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                setIsCallingOut(false);
                cleanPeer(payload.sender);
            }
        });

        ch.on('broadcast', { event: 'webrtc-end' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                if (incomingCallRef.current?.sender === payload.sender) setIncomingCall(null);
                cleanPeer(payload.sender);
            }
        });

        ch.on('broadcast', { event: 'webrtc-request-offer' }, ({ payload }) => {
            if (payload.targetEmail === userEmail && inCallRef.current) {
                startWebRTCCall(payload.sender, true);
            }
        });

        ch.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                try { await ch.track({ email: userEmail, online: true }); } catch (e) { }

                if (autoJoinCallerRef.current) {
                    const callerToJoin = autoJoinCallerRef.current;
                    autoJoinCallerRef.current = null;
                    setTimeout(() => {
                        ch.send({ type: 'broadcast', event: 'webrtc-request-offer', payload: { targetEmail: callerToJoin, sender: userEmail } });
                    }, 1500);
                }
            }
        });

        return () => { try { ch.untrack(); supabase.removeChannel(ch); } catch (e) { } channelRef.current = null; };
    }, [userEmail]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64AudioMessage = reader.result;
                    if (!selectedContact) return;
                    const { data, error } = await supabase.from('messages').insert([{ sender_email: userEmail, receiver_email: selectedContact, text: `[VOICE]${base64AudioMessage}` }]).select();
                    if (!error && data?.length) setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
                };
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) { alert("Could not access microphone."); }
    };

    const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };
    const toggleRecording = () => isRecording ? stopRecording() : startRecording();

    const handleEmojiSelect = (emoji) => {
        setChatInput(prev => prev + emoji);
        setShowEmojiPicker(false);
        const textarea = document.querySelector('textarea');
        if (textarea) textarea.focus();
    };

    const sendMsg = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedContact) return;
        const txt = chatInput;
        setChatInput('');
        setShowEmojiPicker(false);
        const { data, error } = await supabase.from('messages').insert([{ sender_email: userEmail, receiver_email: selectedContact, text: txt }]).select();
        if (!error && data?.length) setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        let hasImage = false, imageFile = null;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                hasImage = true;
                imageFile = items[i].getAsFile();
                break;
            }
        }

        if (hasImage && imageFile) {
            e.preventDefault();
            let currentText = chatInput.trim();
            const pastedText = e.clipboardData.getData('text/plain');
            if (pastedText) currentText = currentText ? (currentText + '\n' + pastedText) : pastedText;

            if (currentText && selectedContact) {
                const { data: textDataObj, error: textErr } = await supabase.from('messages').insert([{ sender_email: userEmail, receiver_email: selectedContact, text: currentText }]).select();
                if (!textErr && textDataObj?.length) setChatMessages(prev => prev.find(m => m.id === textDataObj[0].id) ? prev : [...prev, textDataObj[0]]);
                setChatInput('');
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Image = reader.result;
                if (!selectedContact) return;
                const { data, error } = await supabase.from('messages').insert([{ sender_email: userEmail, receiver_email: selectedContact, text: `[IMAGE]${base64Image}` }]).select();
                if (!error && data?.length) setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
            };
            reader.readAsDataURL(imageFile);
        }
    };

    const handleSendLocalTranscript = async () => {
        if (callTranscript.length === 0) return;
        const targetEmail = prompt("Enter the email address to send the translation history to:");
        if (!targetEmail || !targetEmail.includes('@')) {
            if (targetEmail !== null) alert("Please enter a valid email address.");
            return;
        }

        setIsSendingLocalTranscript(true);
        try {
            let emailText = transcriptSummary ? `✨ AI Summary:\n${transcriptSummary}\n\n---\n\n` : '';
            emailText += callTranscript.map(e => `[${e.time}]\nSpoken (${spokenLang}): ${e.original}\nTranslated (${targetLang}): ${e.translated}\n`).join('\n');

            let htmlLines = '';
            if (transcriptSummary) {
                htmlLines += `
                <div style="background-color: #005c4b20; border-left: 4px solid #00a884; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
                    <h3 style="color: #00a884; margin-top: 0; margin-bottom: 8px;">✨ AI Summary</h3>
                    <p style="color: #1e293b; line-height: 1.5; margin: 0; font-size: 15px;">${transcriptSummary}</p>
                </div>
                `;
            }

            htmlLines += callTranscript.map(e => {
                let itemHtml = `<div style="margin-bottom: 16px; background-color: #f0fdf4; padding: 12px; border-radius: 8px; border-left: 4px solid #00a884;">`;
                itemHtml += `<div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">${e.time}</div>`;
                itemHtml += `<div style="color: #64748b; font-size: 11px; margin-bottom: 2px; text-transform: uppercase;">Spoken (${spokenLang})</div>`;
                itemHtml += `<div style="color: #1e293b; font-weight: 600; font-size: 15px; margin-bottom: ${e.original !== e.translated ? '6px' : '0'};">${e.original}</div>`;
                if (e.original !== e.translated) {
                    itemHtml += `<div style="color: #64748b; font-size: 11px; margin-bottom: 2px; text-transform: uppercase; padding-top: 6px; border-top: 1px solid rgba(0,0,0,0.05);">Translated (${targetLang})</div>`;
                    itemHtml += `<div style="color: #0369a1; font-weight: bold; font-size: 16px;">${e.translated}</div>`;
                }
                itemHtml += `</div>`;
                return itemHtml;
            }).join('');

            const currentYear = new Date().getFullYear();
            const currentDate = new Date().toLocaleDateString();

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f7f6; padding: 20px; border-radius: 12px;">
                    <div style="background-color: #00a884; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h2 style="margin: 0;">TotalRecall Local Translation History</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Recorded on ${currentDate}</p>
                    </div>
                    <div style="background-color: white; padding: 20px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        ${htmlLines}
                    </div>
                    <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
                        © ${currentYear} NoirSoft Ltd - TotalRecall
                    </div>
                </div>
            `;

            const { error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: targetEmail,
                    subject: 'TotalRecall Translation History',
                    text: emailText,
                    html: emailHtml
                }
            });

            if (error) throw error;
            alert('Translation history sent successfully!');
        } catch (err) {
            alert('Failed to send history: ' + err.message);
        } finally {
            setIsSendingLocalTranscript(false);
        }
    };

    const showSidebar = !isMobile || !selectedContact;
    const showChat = !isMobile || !!selectedContact;
    const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(e); } };

    const safeEmail = userEmail?.toLowerCase() || '';
    const allKnown = [...members, ...savedContacts];
    const dispMembers = members.filter(m => m.email?.toLowerCase() !== safeEmail);
    const dispContacts = savedContacts.filter(c => c.email && c.email.trim().toLowerCase() !== safeEmail);

    const sortedOnlineUsers = [...onlineUsers].sort((a, b) => {
        const nameA = allKnown.find(k => k.email?.toLowerCase() === a.email?.toLowerCase())?.name || a.email.split('@')[0];
        const nameB = allKnown.find(k => k.email?.toLowerCase() === b.email?.toLowerCase())?.name || b.email.split('@')[0];
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    const sortedMembers = [...dispMembers].sort((a, b) => {
        const nameA = a.name?.trim() || a.email.split('@')[0];
        const nameB = b.name?.trim() || b.email.split('@')[0];
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    const sortedContacts = [...dispContacts].sort((a, b) => {
        const nameA = a.name?.trim() || (a.email.includes('@') ? a.email.split('@')[0] : a.email);
        const nameB = b.name?.trim() || (b.email.includes('@') ? b.email.split('@')[0] : b.email);
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    const query = searchQuery.toLowerCase();

    const filteredOnlineUsers = sortedOnlineUsers.filter(u => {
        const name = allKnown.find(k => k.email?.toLowerCase() === u.email?.toLowerCase())?.name || u.email.split('@')[0];
        return name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    });

    const filteredMembers = sortedMembers.filter(c => {
        const name = c.name?.trim() || c.email.split('@')[0];
        return name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query);
    });

    const filteredContacts = sortedContacts.filter(c => {
        const name = c.name?.trim() || (c.email.includes('@') ? c.email.split('@')[0] : c.email);
        return name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query);
    });

    const activeContact = allKnown.find(c => c.email?.toLowerCase() === selectedContact?.toLowerCase());
    const activeName = activeContact?.name || selectedContact?.split('@')[0] || '';
    const memberCount = members.filter(m => m.email?.toLowerCase() !== safeEmail).length;
    const totalOnlineCount = onlineUsers.length + 1;

    const getFlagUrl = (mobileStr) => {
        if (!mobileStr) return '';
        const clean = mobileStr.replace(/[^0-9]/g, '');
        if (clean.startsWith('44')) return 'https://flagcdn.com/w20/gb.png';
        if (clean.startsWith('34')) return 'https://flagcdn.com/w20/es.png';
        if (clean.startsWith('1')) return 'https://flagcdn.com/w20/us.png';
        return 'https://flagcdn.com/w20/un.png';
    };

    const handleJumpLetter = (e) => {
        const val = e.target.value.toUpperCase();
        if (val && !/^[A-Z]$/.test(val)) return;
        setJumpLetter(val);
        if (!val) {
            setHighlightedEmail(null);
            return;
        }

        const getOnlineName = (u) => allKnown.find(k => k.email?.toLowerCase() === u.email?.toLowerCase())?.name || u.email.split('@')[0];
        const getMemberName = (c) => c.name?.trim() || c.email.split('@')[0];
        const getContactName = (c) => c.name?.trim() || (c.email.includes('@') ? c.email.split('@')[0] : c.email);

        let match = null;

        if (isOnlineExpanded && !match) {
            match = filteredOnlineUsers.find(u => getOnlineName(u).toUpperCase().startsWith(val));
        }
        if (isCapitalOlondra && isMembersExpanded && !match) {
            match = filteredMembers.find(c => getMemberName(c).toUpperCase().startsWith(val));
        }
        if (isContactsExpanded && !match) {
            match = filteredContacts.find(c => getContactName(c).toUpperCase().startsWith(val));
        }

        if (match) {
            const el = document.getElementById(`contact-row-${match.email}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
                setHighlightedEmail(match.email);
                highlightTimeoutRef.current = setTimeout(() => setHighlightedEmail(null), 1500);
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: '#111b21', color: '#e9edef', fontFamily: 'Segoe UI, sans-serif', overflow: 'hidden', position: 'relative' }}>

            {/* ✨ CUSTOM IN-APP NOTIFICATION TOAST ✨ */}
            {inAppNotif && (
                <div
                    onClick={() => {
                        setSelectedContact(inAppNotif.email);
                        setInAppNotif(null);
                    }}
                    style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#202c33', padding: '15px 20px', borderRadius: '12px', zIndex: 9999, border: '1px solid #00a884', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', animation: 'slideDown 0.3s ease-out' }}
                >
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#111', fontWeight: 'bold' }}>
                        {inAppNotif.sender[0]?.toUpperCase()}
                    </div>
                    <div>
                        <div style={{ color: '#00a884', fontWeight: 'bold', marginBottom: '4px' }}>New message from {inAppNotif.sender}</div>
                        <div style={{ color: '#e9edef', fontSize: '14px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inAppNotif.text}</div>
                    </div>
                </div>
            )}

            {showTranscriptModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 5000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#202c33', padding: '25px', borderRadius: '16px', width: '550px', maxWidth: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #2a3942', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ color: '#00a884', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                📝 Call Transcript
                            </h3>
                            <button
                                onClick={handleGenerateSummary}
                                disabled={isSummarizing || callTranscript.length === 0}
                                style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#2a3942', color: '#00a884', border: '1px solid #00a884', cursor: (isSummarizing || callTranscript.length === 0) ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                            >
                                {isSummarizing ? '✨ Summarizing...' : '✨ AI Summary'}
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', backgroundColor: '#111b21', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {transcriptSummary && (
                                <div style={{ backgroundColor: '#005c4b30', borderLeft: '4px solid #00a884', padding: '12px', marginBottom: '15px', borderRadius: '8px' }}>
                                    <h4 style={{ color: '#00a884', margin: '0 0 8px 0' }}>✨ Summary</h4>
                                    <p style={{ color: '#e9edef', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{transcriptSummary}</p>
                                </div>
                            )}

                            {callTranscript.map((entry, idx) => {
                                const isYou = entry.sender === userEmail;
                                return (
                                    <div key={idx} style={{
                                        marginBottom: '12px',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        backgroundColor: isYou ? '#005c4b20' : '#2a394250',
                                        borderLeft: `4px solid ${isYou ? '#00a884' : '#38bdf8'}`,
                                        display: 'flex', flexDirection: 'column', gap: '4px'
                                    }}>
                                        <div style={{ fontSize: '12px', color: '#8696a0', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 'bold', color: isYou ? '#00a884' : '#38bdf8' }}>
                                                {isYou ? 'You' : entry.sender.split('@')[0]}
                                            </span>
                                            <span>{entry.time}</span>
                                        </div>
                                        <div style={{ color: '#e9edef', fontWeight: 'bold', fontSize: '15px' }}>{entry.original}</div>
                                        {entry.original !== entry.translated && (
                                            <div style={{ color: '#8696a0', fontStyle: 'italic', fontSize: '14px', marginTop: '2px' }}>{entry.translated}</div>
                                        )}
                                    </div>
                                );
                            })}
                            {callTranscript.length === 0 && (
                                <div style={{ color: '#8696a0', textAlign: 'center', marginTop: '40px', fontStyle: 'italic' }}>
                                    No transcription was recorded during this call.
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                disabled={isSendingTranscript || callTranscript.length === 0}
                                onClick={async () => {
                                    setIsSendingTranscript(true);
                                    try {
                                        let emailText = transcriptSummary ? `✨ AI Summary:\n${transcriptSummary}\n\n---\n\n` : '';
                                        emailText += callTranscript.map(e => `[${e.time}] ${e.sender === userEmail ? 'You' : e.sender.split('@')[0]}:\nOriginal: ${e.original}\nTranslated: ${e.translated}\n`).join('\n');

                                        let htmlLines = '';
                                        if (transcriptSummary) {
                                            htmlLines += `
                                            <div style="background-color: #f0fdf4; border-left: 4px solid #00a884; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
                                                <h3 style="color: #00a884; margin-top: 0; margin-bottom: 8px;">✨ AI Summary</h3>
                                                <p style="color: #1e293b; line-height: 1.5; margin: 0; font-size: 15px;">${transcriptSummary}</p>
                                            </div>
                                            `;
                                        }

                                        htmlLines += callTranscript.map(e => {
                                            const isYou = e.sender === userEmail;
                                            const senderName = isYou ? 'You' : e.sender.split('@')[0];
                                            const headerColor = isYou ? '#00a884' : '#38bdf8';
                                            const bgColor = isYou ? '#f0fdf4' : '#f0f9ff';
                                            let itemHtml = `<div style="margin-bottom: 16px; background-color: ${bgColor}; padding: 12px; border-radius: 8px; border-left: 4px solid ${headerColor};">`;
                                            itemHtml += `<div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">${e.time} - <strong style="color: ${headerColor};">${senderName}</strong></div>`;
                                            itemHtml += `<div style="color: #1e293b; font-weight: 600; font-size: 15px; margin-bottom: ${e.original !== e.translated ? '6px' : '0'};">${e.original}</div>`;
                                            if (e.original !== e.translated) {
                                                itemHtml += `<div style="color: #475569; font-style: italic; font-size: 14px; padding-top: 6px; border-top: 1px solid rgba(0,0,0,0.05);">${e.translated}</div>`;
                                            }
                                            itemHtml += `</div>`;
                                            return itemHtml;
                                        }).join('');

                                        const emptyState = callTranscript.length === 0 ? '<p style="color: #64748b; text-align: center;">No transcript data available.</p>' : '';
                                        const currentYear = new Date().getFullYear();
                                        const currentDate = new Date().toLocaleDateString();

                                        const emailHtml = `
                                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f7f6; padding: 20px; border-radius: 12px;">
                                                <div style="background-color: #00a884; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                                                    <h2 style="margin: 0;">TotalRecall Call Transcript</h2>
                                                    <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Recorded on ${currentDate}</p>
                                                </div>
                                                <div style="background-color: white; padding: 20px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                                                    ${htmlLines}
                                                    ${emptyState}
                                                </div>
                                                <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
                                                    © ${currentYear} NoirSoft Ltd - TotalRecall
                                                </div>
                                            </div>
                                        `;

                                        const { error } = await supabase.functions.invoke('send-email', {
                                            body: {
                                                to: userEmail,
                                                subject: 'TotalRecall Call Transcript',
                                                text: emailText,
                                                html: emailHtml
                                            }
                                        });
                                        if (error) throw error;
                                        alert('Transcript sent successfully!');
                                        setShowTranscriptModal(false);
                                        setCallTranscript([]);
                                        setTranscriptSummary('');
                                    } catch (err) {
                                        alert('Failed to send transcript: ' + err.message);
                                    } finally {
                                        setIsSendingTranscript(false);
                                    }
                                }}
                                style={{ padding: '10px 18px', borderRadius: '8px', backgroundColor: '#00a884', color: '#111', border: 'none', cursor: (isSendingTranscript || callTranscript.length === 0) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (isSendingTranscript || callTranscript.length === 0) ? 0.5 : 1, transition: '0.2s' }}>
                                {isSendingTranscript ? '⏳ Sending...' : '📧 Send via Email'}
                            </button>
                            <button onClick={() => { setShowTranscriptModal(false); setCallTranscript([]); setTranscriptSummary(''); }} style={{ padding: '10px 18px', borderRadius: '8px', backgroundColor: 'transparent', color: '#8696a0', border: '1px solid #8696a0', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>Dismiss</button>
                        </div>
                    </div>
                </div>
            )}

            {showLocalTranslator && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0b141a', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>

                    <div style={{ padding: '15px 20px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222d34', flexWrap: 'wrap', gap: '10px' }}>
                        <h3 style={{ margin: 0, color: '#00a884', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {t('openTranslator', uiLanguage)}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            {callTranscript.length > 0 && (
                                <>
                                    <button
                                        onClick={handleGenerateSummary}
                                        disabled={isSummarizing}
                                        style={{ background: 'none', border: '1px solid #00a884', color: '#00a884', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', cursor: isSummarizing ? 'not-allowed' : 'pointer', opacity: isSummarizing ? 0.5 : 1, fontWeight: 'bold' }}
                                    >
                                        {isSummarizing ? '✨ Summarizing...' : '✨ AI Summary'}
                                    </button>
                                    <button
                                        onClick={handleSendLocalTranscript}
                                        disabled={isSendingLocalTranscript}
                                        style={{ background: 'none', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', cursor: isSendingLocalTranscript ? 'not-allowed' : 'pointer', opacity: isSendingLocalTranscript ? 0.5 : 1, fontWeight: 'bold' }}
                                    >
                                        {isSendingLocalTranscript ? '⏳ Sending...' : '📧 Email History'}
                                    </button>
                                    <button
                                        onClick={() => { setCallTranscript([]); setTranscriptSummary(''); }}
                                        style={{ background: 'none', border: '1px solid #8696a0', color: '#8696a0', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
                                    >
                                        Clear History
                                    </button>
                                </>
                            )}
                            <button onClick={() => { setShowLocalTranslator(false); if (!inCallRef.current) stopCC(); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '24px', cursor: 'pointer', marginLeft: '10px' }}>✖</button>
                        </div>
                    </div>

                    <div ref={localTranslatorScrollRef} style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', backgroundColor: '#0b141a' }}>
                        {callTranscript.length === 0 && !subtitles[userEmail]?.original && (
                            <div style={{ margin: 'auto', color: '#8696a0', textAlign: 'center', fontStyle: 'italic' }}>
                                Start speaking to see the translation history...
                            </div>
                        )}

                        {transcriptSummary && (
                            <div style={{ backgroundColor: '#005c4b30', borderLeft: '4px solid #00a884', padding: '12px', borderRadius: '8px' }}>
                                <h4 style={{ color: '#00a884', margin: '0 0 8px 0' }}>✨ Summary</h4>
                                <p style={{ color: '#e9edef', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{transcriptSummary}</p>
                            </div>
                        )}

                        {callTranscript.map((entry, idx) => (
                            <div key={idx} style={{
                                backgroundColor: '#202c33',
                                padding: '16px',
                                borderRadius: '12px',
                                borderLeft: `4px solid #00a884`,
                                display: 'flex', flexDirection: 'column', gap: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8696a0' }}>
                                    <span style={{ fontWeight: 'bold', color: '#00a884' }}>{entry.time}</span>
                                </div>
                                <div>
                                    <div style={{ color: '#8696a0', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Spoken ({spokenLang})</div>
                                    <div style={{ color: '#e9edef', fontSize: '16px' }}>{entry.original}</div>
                                </div>
                                {entry.original !== entry.translated && (
                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ color: '#8696a0', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Translated ({targetLang})</div>
                                        <div style={{ color: '#38bdf8', fontSize: '18px', fontWeight: 'bold' }}>{entry.translated}</div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {subtitles[userEmail]?.original && (
                            <div style={{
                                backgroundColor: '#111b21',
                                padding: '16px',
                                borderRadius: '12px',
                                borderLeft: `4px solid #ef4444`,
                                display: 'flex', flexDirection: 'column', gap: '8px',
                                border: '1px dashed #2a3942'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1.5s infinite' }} />
                                    Listening...
                                </div>
                                <div>
                                    <div style={{ color: '#8696a0', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Spoken ({spokenLang})</div>
                                    <div style={{ color: '#aebac1', fontSize: '16px', fontStyle: 'italic' }}>{subtitles[userEmail].original}</div>
                                </div>
                                {subtitles[userEmail].translated && subtitles[userEmail].translated !== subtitles[userEmail].original && subtitles[userEmail].translated !== '...' && (
                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ color: '#8696a0', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Translating ({targetLang})</div>
                                        <div style={{ color: '#38bdf8', fontSize: '18px', fontWeight: 'bold', fontStyle: 'italic' }}>{subtitles[userEmail].translated}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '20px', backgroundColor: '#202c33', borderTop: '1px solid #222d34' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <select value={spokenLang} onChange={(e) => {
                                const newVal = e.target.value;
                                setSpokenLang(newVal);
                                spokenLangRef.current = newVal;
                                saveUserSettings(newVal, targetLang);
                                broadcastLanguageChange(newVal, targetLang);
                                if (isTranscribingRef.current) {
                                    stopCC();
                                    setTimeout(startCC, 300);
                                }
                            }} style={{ padding: '10px', borderRadius: '8px', background: '#2a3942', color: 'white', border: '1px solid #38bdf8', flex: 1, maxWidth: '150px' }}>
                                <LanguageOptions />
                            </select>

                            <button onClick={swapLanguages} title="Swap Languages" style={{ background: '#00a884', color: '#111', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>⇄</button>

                            <select value={targetLang} onChange={(e) => {
                                const newVal = e.target.value;
                                setTargetLang(newVal);
                                targetLangRef.current = newVal;
                                saveUserSettings(spokenLang, newVal);
                                broadcastLanguageChange(spokenLang, newVal);
                            }} style={{ padding: '10px', borderRadius: '8px', background: '#2a3942', color: 'white', border: '1px solid #00a884', flex: 1, maxWidth: '150px' }}>
                                <LanguageOptions />
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button onClick={toggleTranscription} style={{ flex: 1, maxWidth: '200px', padding: '12px', borderRadius: '24px', backgroundColor: isTranscribing ? '#ef4444' : '#00a884', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                                {isTranscribing ? '⏹ Stop Listening' : '🎤 Start Listening'}
                            </button>
                            <button onClick={toggleTTS} style={{ flex: 1, maxWidth: '200px', padding: '12px', borderRadius: '24px', backgroundColor: isTTSOn ? '#005c4b' : 'transparent', color: isTTSOn ? 'white' : '#00a884', border: '1px solid #00a884', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                {isTTSOn ? '🔊 Speaker: ON' : '🔇 Speaker: OFF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {vonageCallModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 6000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#202c33', padding: '25px', borderRadius: '12px', width: '350px', maxWidth: '90%', border: '1px solid #222d34', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ color: '#00a884', marginTop: 0, marginBottom: '15px' }}>📞 Call Offline User</h3>
                        <p style={{ color: '#8696a0', fontSize: '13px', marginBottom: '20px' }}>
                            This user is currently offline. We can call their mobile to invite them to the chat.
                        </p>

                        <label style={{ display: 'block', color: '#e9edef', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>Mobile Number:</label>
                        <input
                            type="tel"
                            value={vonageMobileInput}
                            onChange={(e) => setVonageMobileInput(e.target.value)}
                            placeholder="Include country code (e.g. 44...)"
                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #2a3942', backgroundColor: '#111b21', color: 'white', boxSizing: 'border-box', marginBottom: '15px' }}
                        />

                        <label style={{ display: 'block', color: '#e9edef', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>Spoken Message (Text-to-Speech):</label>
                        <textarea
                            value={vonageCustomMessage}
                            onChange={(e) => setVonageCustomMessage(e.target.value)}
                            placeholder="Message to be spoken when they pick up..."
                            rows={3}
                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #2a3942', backgroundColor: '#111b21', color: 'white', boxSizing: 'border-box', marginBottom: '20px', resize: 'none', fontFamily: 'inherit' }}
                        />

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setVonageCallModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent', color: '#8696a0', border: '1px solid #8696a0', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            <button onClick={executeVonageCall} disabled={isVonageCalling} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#00a884', color: '#111', border: 'none', cursor: isVonageCalling ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                {isVonageCalling ? 'Calling...' : 'Call Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showMobileModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#202c33', padding: '25px', borderRadius: '12px', width: '300px', maxWidth: '90%', border: '1px solid #222d34', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ color: '#00a884', marginTop: 0, marginBottom: '15px' }}>{t('changeMobile', uiLanguage)}</h3>
                        <p style={{ color: '#8696a0', fontSize: '13px', marginBottom: '20px' }}>Enter your new mobile number below to update your profile.</p>
                        <input
                            type="tel"
                            value={newMobile}
                            onChange={(e) => setNewMobile(e.target.value)}
                            placeholder="For a UK number 44 then your number"
                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #2a3942', backgroundColor: '#111b21', color: 'white', boxSizing: 'border-box', marginBottom: '20px' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowMobileModal(false); setNewMobile(''); }} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent', color: '#8696a0', border: '1px solid #8696a0', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            <button onClick={handleUpdateMobile} disabled={isUpdatingMobile} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#00a884', color: '#111', border: 'none', cursor: isUpdatingMobile ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                {isUpdatingMobile ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingContact && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 6000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#202c33', padding: '25px', borderRadius: '12px', width: '300px', maxWidth: '90%', border: '1px solid #222d34', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ color: '#00a884', marginTop: 0, marginBottom: '15px' }}>✏️ Edit Contact Mobile</h3>
                        <p style={{ color: '#8696a0', fontSize: '13px', marginBottom: '20px' }}>Editing mobile for: <br /><b>{editingContact.email}</b></p>

                        {isFetchingContactMobile && <p style={{ color: '#00a884', fontSize: '12px', marginTop: '-15px', marginBottom: '15px' }}>Fetching current number...</p>}

                        <input
                            type="tel"
                            value={isFetchingContactMobile ? 'Loading...' : editMobileValue}
                            onChange={(e) => setEditMobileValue(e.target.value)}
                            placeholder="Mobile number (include country code)"
                            disabled={isFetchingContactMobile}
                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #2a3942', backgroundColor: '#111b21', color: isFetchingContactMobile ? '#8696a0' : 'white', boxSizing: 'border-box', marginBottom: '20px' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingContact(null)} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent', color: '#8696a0', border: '1px solid #8696a0', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            <button onClick={async () => {
                                setIsSavingContactMobile(true);
                                try {
                                    if (editingContact.type === 'member' || editingContact.email.includes('@')) {
                                        const trimmedMobile = editMobileValue.trim();

                                        const { data: updateData, error: updateError } = await supabase
                                            .from('profiles')
                                            .update({ mobile: trimmedMobile })
                                            .eq('email', editingContact.email)
                                            .select();

                                        if (updateError) {
                                            if (updateError.message.includes('permission denied') || updateError.code === '42501') {
                                                const cleanMobile = trimmedMobile.replace(/[^0-9]/g, '');
                                                setSavedContacts(prev => {
                                                    const exists = prev.find(c => c.email === editingContact.email);
                                                    const updated = exists
                                                        ? prev.map(c => c.email === editingContact.email ? { ...c, mobile: cleanMobile } : c)
                                                        : [...prev, { name: editingContact.email.split('@')[0], email: editingContact.email, mobile: cleanMobile }];
                                                    localStorage.setItem('totalRecallContacts', JSON.stringify(updated));
                                                    return updated;
                                                });

                                                alert(`Database 'profiles' table permissions (RLS) blocked the save.\n\nThe mobile number has been saved to your Local Contacts instead so you can call them now.\n\nTo fix the database globally, an admin must add an UPDATE policy to the 'profiles' table in Supabase.`);
                                                setEditingContact(null);
                                                return;
                                            } else {
                                                throw updateError;
                                            }
                                        }

                                        if (!updateData || updateData.length === 0) {
                                            const { error: insertError } = await supabase
                                                .from('profiles')
                                                .insert([{ email: editingContact.email, mobile: trimmedMobile }]);

                                            if (insertError) {
                                                if (insertError.message.includes('permission denied') || insertError.code === '42501') {
                                                    const cleanMobile = trimmedMobile.replace(/[^0-9]/g, '');
                                                    setSavedContacts(prev => {
                                                        const exists = prev.find(c => c.email === editingContact.email);
                                                        const updated = exists
                                                            ? prev.map(c => c.email === editingContact.email ? { ...c, mobile: cleanMobile } : c)
                                                            : [...prev, { name: editingContact.email.split('@')[0], email: editingContact.email, mobile: cleanMobile }];
                                                        localStorage.setItem('totalRecallContacts', JSON.stringify(updated));
                                                        return updated;
                                                    });
                                                    alert(`Database 'profiles' table permissions (RLS) blocked the save.\n\nThe mobile number has been saved to your Local Contacts instead so you can call them now.\n\nTo fix the database globally, an admin must add an UPDATE policy to the 'profiles' table in Supabase.`);
                                                    setEditingContact(null);
                                                    return;
                                                } else {
                                                    throw insertError;
                                                }
                                            }
                                        }

                                        setMembers(prev => prev.map(m =>
                                            m.email === editingContact.email ? { ...m, mobile: trimmedMobile } : m
                                        ));

                                        alert('Mobile number updated in database.');
                                    } else {
                                        const newMobileStr = editMobileValue.trim().replace(/[^0-9]/g, '');
                                        setSavedContacts(prev => {
                                            const updated = prev.map(c =>
                                                c.email === editingContact.email ? { ...c, email: newMobileStr, mobile: newMobileStr } : c
                                            );
                                            localStorage.setItem('totalRecallContacts', JSON.stringify(updated));
                                            return updated;
                                        });
                                        if (selectedContact === editingContact.email) {
                                            setSelectedContact(newMobileStr);
                                        }
                                        alert('Local contact mobile updated.');
                                    }
                                    setEditingContact(null);
                                } catch (err) {
                                    alert('Failed to update: ' + err.message);
                                } finally {
                                    setIsSavingContactMobile(false);
                                }
                            }} disabled={isSavingContactMobile || isFetchingContactMobile} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#00a884', color: '#111', border: 'none', cursor: (isSavingContactMobile || isFetchingContactMobile) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                {isSavingContactMobile ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {incomingCall && (
                    <div style={{ position: 'fixed', top: 20, right: 20, backgroundColor: '#202c33', padding: 20, borderRadius: 8, zIndex: 1000, border: '1px solid #00a884', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        <h4 style={{ margin: '0 0 10px' }}>📹 Incoming Call</h4>
                        <p style={{ margin: '0 0 15px' }}>From: <b>{incomingCall.sender.split('@')[0]}</b></p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={acceptIncoming} style={{ flex: 1, backgroundColor: '#00a884', border: 'none', padding: 8, borderRadius: 4, color: '#111', fontWeight: 'bold', cursor: 'pointer' }}>Accept</button>
                            <button onClick={decline} style={{ flex: 1, backgroundColor: '#ef4444', border: 'none', padding: 8, borderRadius: 4, color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Decline</button>
                        </div>
                    </div>
                )}

                {showSidebar && (
                    <div style={{ width: isMobile ? '100%' : '30%', minWidth: '250px', flexShrink: 0, borderRight: '1px solid #222d34', display: 'flex', flexDirection: 'column', backgroundColor: '#111b21', height: '100%', overflow: 'hidden' }}>

                        {/* Desktop Notifications Banner */}
                        {notifPermission === 'default' && (
                            <div
                                onClick={requestNotificationPermission}
                                style={{ padding: '10px 15px', backgroundColor: '#005c4b', color: 'white', textAlign: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #222d34' }}
                            >
                                🔔 Click here to enable browser notifications
                            </div>
                        )}

                        <div style={{ padding: 15, backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#111', fontWeight: 'bold' }}>
                                    {displayName[0]?.toUpperCase()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <b style={{ color: '#00a884', fontSize: '16px' }}>{displayName}</b>
                                    {currentUserMobile ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <img
                                                src={getFlagUrl(currentUserMobile)}
                                                alt="Country"
                                                style={{ width: '16px', height: '12px', borderRadius: '2px' }}
                                            />
                                            <span style={{ color: '#8696a0', fontSize: '13px' }}>{currentUserMobile}</span>
                                        </div>
                                    ) : (
                                        <span style={{ color: '#ef4444', fontSize: '12px' }}>
                                            You need to add your mobile number. See change mobile number.
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#aebac1', cursor: 'pointer' }}>{t('logout', uiLanguage)}</button>
                        </div>

                        {isMobile && inVoiceCall && (
                            <div
                                onClick={() => {
                                    if (activeCallEmails.length > 0) {
                                        setSelectedContact(activeCallEmails[0]);
                                    }
                                }}
                                style={{ padding: 15, backgroundColor: '#005c4b', color: 'white', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold', borderBottom: '1px solid #222d34' }}
                            >
                                {t('activeCall', uiLanguage)}
                            </div>
                        )}

                        <div style={{ padding: '15px', borderBottom: '1px solid #222d34', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => setShowLocalTranslator(true)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#00a884', color: '#111', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                            >
                                {t('openTranslator', uiLanguage)}
                            </button>
                            <button
                                onClick={() => {
                                    setNewMobile(currentUserMobile || '');
                                    setShowMobileModal(true);
                                }}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#2a3942', color: '#00a884', border: '1px solid #00a884', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {t('changeMobile', uiLanguage)}
                            </button>
                        </div>

                        <div style={{ padding: '10px 15px', borderBottom: '1px solid #222d34', backgroundColor: '#111b21', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#2a3942', border: '1px solid #00a884', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                                <span style={{ color: '#00a884', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {t('uiLang', uiLanguage)}
                                </span>
                                <select
                                    value={uiLanguage}
                                    onChange={(e) => {
                                        setUiLanguage(e.target.value);
                                        localStorage.setItem('ui_language', e.target.value);
                                    }}
                                    style={{ padding: '4px', borderRadius: '4px', background: '#111b21', color: 'white', border: '1px solid #38bdf8', cursor: 'pointer', maxWidth: '120px', fontSize: '12px' }}
                                >
                                    <LanguageOptions />
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder={t('search', uiLanguage)}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ flex: 1, minWidth: 0, padding: '10px', borderRadius: '8px', border: '1px solid #2a3942', backgroundColor: '#202c33', color: 'white', boxSizing: 'border-box', outline: 'none' }}
                                />
                                <input
                                    type="text"
                                    placeholder="A-Z"
                                    value={jumpLetter}
                                    onChange={handleJumpLetter}
                                    maxLength={1}
                                    style={{ width: '50px', minWidth: '50px', flexShrink: 0, padding: '10px', borderRadius: '8px', border: '1px solid #00a884', backgroundColor: '#202c33', color: '#00a884', textAlign: 'center', textTransform: 'uppercase', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                            <div onClick={() => setIsOnlineExpanded(!isOnlineExpanded)} style={{ padding: '10px 15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #222d34' }}>
                                <span style={{ color: '#8696a0', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' }}>{t('online', uiLanguage)} ({filteredOnlineUsers.length})</span>
                                <span style={{ color: '#8696a0' }}>{isOnlineExpanded ? '▼' : '▶'}</span>
                            </div>
                            {isOnlineExpanded && filteredOnlineUsers.map(u => (
                                <div id={`contact-row-${u.email}`} key={u.email} onClick={() => setSelectedContact(u.email)} style={{ padding: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', transition: 'background-color 0.5s', backgroundColor: highlightedEmail === u.email ? 'rgba(0, 168, 132, 0.4)' : (selectedContact === u.email ? '#2a3942' : 'transparent') }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#38bdf8', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#111', fontWeight: 'bold' }}>{u.email[0]?.toUpperCase()}</div>
                                    <span>{allKnown.find(k => k.email?.toLowerCase() === u.email?.toLowerCase())?.name || u.email.split('@')[0]}</span>
                                </div>
                            ))}

                            {isCapitalOlondra && (
                                <>
                                    <div onClick={() => setIsMembersExpanded(!isMembersExpanded)} style={{ padding: '10px 15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #222d34', marginTop: 10 }}>
                                        <span style={{ color: '#8696a0', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' }}>{isCapitalOlondra ? 'Registered Users' : t('members', uiLanguage)} ({filteredMembers.length})</span>
                                        <span style={{ color: '#8696a0' }}>{isMembersExpanded ? '▼' : '▶'}</span>
                                    </div>
                                    {isMembersExpanded && filteredMembers.map(c => {
                                        const isContact = savedContacts.some(sc => sc.email?.trim().toLowerCase() === c.email?.trim().toLowerCase());
                                        return (
                                            <div id={`contact-row-${c.email}`} key={c.email} onClick={() => setSelectedContact(c.email)} style={{ padding: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', transition: 'background-color 0.5s', backgroundColor: highlightedEmail === c.email ? 'rgba(0, 168, 132, 0.4)' : (selectedContact === c.email ? '#2a3942' : 'transparent') }}>
                                                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#111', fontWeight: 'bold' }}>{(c.name || c.email)[0]?.toUpperCase()}</div>
                                                <div style={{ flexGrow: 1 }}>{c.name?.trim() || c.email.split('@')[0]}</div>
                                                {isCapitalOlondra && (
                                                    <button onClick={(e) => handleEditContactMobileClick(e, c.email, 'member')} style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', fontSize: '16px', padding: '5px', marginRight: '5px' }} title="Edit Mobile">✏️</button>
                                                )}
                                                {!isContact && <button onClick={(e) => { e.stopPropagation(); setSavedContacts(prev => { const updated = [...prev, { name: c.name?.trim() || c.email.split('@')[0], email: c.email }]; localStorage.setItem('totalRecallContacts', JSON.stringify(updated)); return updated; }); }} style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', fontSize: '14px', padding: '5px' }} title={t('addExternal', uiLanguage)}>➕</button>}
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            <div onClick={() => setIsContactsExpanded(!isContactsExpanded)} style={{ padding: '10px 15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #222d34', marginTop: 10 }}>
                                <span style={{ color: '#8696a0', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' }}>{t('contacts', uiLanguage)} ({filteredContacts.length})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); handleImportContacts(); }} disabled={isImporting} style={{ backgroundColor: isImporting ? '#1a2a33' : '#2a3942', color: isImporting ? '#666' : '#00a884', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: isImporting ? 'not-allowed' : 'pointer', fontSize: '11px' }}>{isImporting ? '⏳...' : t('addExternal', uiLanguage)}</button>
                                    <span style={{ color: '#8696a0' }}>{isContactsExpanded ? '▼' : '▶'}</span>
                                </div>
                            </div>
                            {isContactsExpanded && filteredContacts.map(c => (
                                <div id={`contact-row-${c.email}`} key={c.email} onClick={() => setSelectedContact(c.email)} style={{ padding: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', transition: 'background-color 0.5s', backgroundColor: highlightedEmail === c.email ? 'rgba(0, 168, 132, 0.4)' : (selectedContact === c.email ? '#2a3942' : 'transparent') }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#fff', fontWeight: 'bold' }}>{(c.name || c.email)[0]?.toUpperCase()}</div>
                                    <div style={{ flexGrow: 1 }}><div>{c.name || (c.email.includes('@') ? c.email.split('@')[0] : c.email)}</div><div style={{ fontSize: 12, color: '#8696a0' }}>{c.email}</div></div>
                                    {isCapitalOlondra && (
                                        <button onClick={(e) => handleEditContactMobileClick(e, c.email, 'contact')} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '16px', padding: '5px', marginRight: '5px' }} title="Edit Mobile">✏️</button>
                                    )}
                                    <button onClick={(e) => handleRemoveContact(e, c.email)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', fontSize: '14px', padding: '5px' }}>❌</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {showChat && (
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0b141a', height: '100%', overflow: 'hidden' }}>
                        {selectedContact ? (
                            <>
                                <div style={{ padding: '10px 20px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {isMobile && <button onClick={() => setSelectedContact(null)} style={{ background: 'none', border: 'none', color: '#00a884', fontSize: 20, marginRight: 15, cursor: 'pointer' }}>🔙</button>}
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#111', fontWeight: 'bold' }}>{activeName[0]?.toUpperCase()}</div>
                                        <b>{activeName}</b>
                                    </div>

                                    <div style={{ display: 'flex', gap: isMobile ? 5 : 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <button onClick={handleVonageMobileCallUI} disabled={isVonageCalling} style={{ backgroundColor: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: isVonageCalling ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                            {isMobile ? (isVonageCalling ? '📞...' : '📞') : (isVonageCalling ? '📞...' : t('callMobile', uiLanguage))}
                                        </button>

                                        {!inVoiceCall ? (
                                            <button onClick={() => initiateCall(selectedContact)} style={{ backgroundColor: 'transparent', border: '1px solid #00a884', color: '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                {isMobile ? '📹' : t('call', uiLanguage)}
                                            </button>
                                        ) : (
                                            <>
                                                {!activeCallEmails.includes(selectedContact) && (
                                                    <button onClick={() => initiateCall(selectedContact)} style={{ backgroundColor: '#005c4b', border: '1px solid #00a884', color: 'white', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                        {isMobile ? '➕' : t('add', uiLanguage)}
                                                    </button>
                                                )}
                                                <button onClick={toggleTranscription} style={{ backgroundColor: isTranscribing ? '#005c4b' : 'transparent', border: '1px solid #00a884', color: isTranscribing ? 'white' : '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? (isTranscribing ? '💬 On' : '💬 Off') : (isTranscribing ? '💬 On' : '💬 Off')}
                                                </button>
                                                <button onClick={toggleTTS} style={{ backgroundColor: isTTSOn ? '#005c4b' : 'transparent', border: '1px solid #00a884', color: isTTSOn ? 'white' : '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? (isTTSOn ? '🔊 On' : '🔇 Off') : (isTTSOn ? '🔊 On' : '🔇 Off')}
                                                </button>
                                                <button onClick={toggleMute} style={{ backgroundColor: isMuted ? '#ef4444' : 'transparent', border: '1px solid #00a884', color: isMuted ? 'white' : '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? (isMuted ? '🔇' : '🎙️') : (isMuted ? '🔇 Mute' : '🎙️ Mute')}
                                                </button>
                                                <button onClick={toggleCamera} style={{ backgroundColor: isVideoOff ? '#ef4444' : 'transparent', border: '1px solid #00a884', color: isVideoOff ? 'white' : '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? (isVideoOff ? '📷' : '📸') : (isVideoOff ? '📷 Off' : '📸 Off')}
                                                </button>
                                                <button onClick={toggleScreenShare} style={{ backgroundColor: isScreenSharing ? '#005c4b' : 'transparent', border: '1px solid #00a884', color: isScreenSharing ? 'white' : '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? (isScreenSharing ? '💻 Stop' : '💻 Share') : (isScreenSharing ? '💻 Stop' : '💻 Share')}
                                                </button>
                                                <button onClick={() => endCall(true)} style={{ backgroundColor: '#ef4444', border: 'none', color: 'white', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? '🔴' : t('end', uiLanguage)}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {inVoiceCall && isTranscribing && (
                                    <div style={{ backgroundColor: '#1e293b', padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid #334155' }}>
                                        <label>🗣️ My Language:
                                            <select value={spokenLang} onChange={e => {
                                                const newVal = e.target.value;
                                                setSpokenLang(newVal);
                                                spokenLangRef.current = newVal;
                                                saveUserSettings(newVal, targetLang);
                                                broadcastLanguageChange(newVal, targetLang);
                                                if (isTranscribingRef.current) {
                                                    stopCC();
                                                    setTimeout(startCC, 300);
                                                }
                                            }} style={{ marginLeft: '8px', padding: '4px', borderRadius: '4px', background: '#2a3942', color: 'white', border: '1px solid #38bdf8', cursor: 'pointer' }}>
                                                <LanguageOptions />
                                            </select>
                                        </label>
                                        <label>🌐 Their Language:
                                            <select value={targetLang} onChange={e => {
                                                const newVal = e.target.value;
                                                setTargetLang(newVal);
                                                targetLangRef.current = newVal;
                                                saveUserSettings(spokenLang, newVal);
                                                broadcastLanguageChange(spokenLang, newVal);
                                            }} style={{ marginLeft: '8px', padding: '4px', borderRadius: '4px', background: '#2a3942', color: 'white', border: '1px solid #00a884', cursor: 'pointer' }}>
                                                <LanguageOptions />
                                            </select>
                                        </label>
                                    </div>
                                )}

                                {inVoiceCall && (
                                    <div style={{ height: '45vh', backgroundColor: '#000', display: 'grid', gridTemplateColumns: `repeat(${Math.max(Object.keys(remoteStreams).length + 1, 2)}, 1fr)`, gap: 10, padding: 10 }}>
                                        <LocalVideo stream={localStream} subtitle={subtitles[userEmail]} />
                                        {Object.entries(remoteStreams).map(([email, stream]) => (
                                            <RemoteVideo key={email} stream={stream} email={email} allKnownUsers={allKnown} subtitle={subtitles[email]} isTTSOn={isTTSOn} />
                                        ))}
                                    </div>
                                )}

                                <div ref={chatContainerRef} style={{ flexGrow: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)' }}>
                                    {chatMessages.map((m, i) => {
                                        const isVoiceMessage = m.text && m.text.startsWith('[VOICE]');
                                        const isImageMessage = m.text && m.text.startsWith('[IMAGE]');
                                        let content = m.text || '';
                                        if (isVoiceMessage) content = m.text.replace('[VOICE]', '');
                                        else if (isImageMessage) content = m.text.replace('[IMAGE]', '');
                                        const match = !isVoiceMessage && !isImageMessage ? content.match(urlExtractRegex) : null;
                                        let firstUrl = match ? match[0] : null;

                                        return (
                                            <div key={m.id || i} style={{ alignSelf: m.sender_email === userEmail ? 'flex-end' : 'flex-start', backgroundColor: m.sender_email === userEmail ? '#005c4b' : '#202c33', padding: '8px 12px', borderRadius: 8, maxWidth: '65%', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                {isVoiceMessage ? (
                                                    <audio controls src={content} style={{ height: '40px', maxWidth: '100%', outline: 'none' }} />
                                                ) : isImageMessage ? (
                                                    <img src={content} alt="Pasted attachment" style={{ maxWidth: '100%', borderRadius: 8 }} />
                                                ) : (
                                                    <>{renderTextWithLinks(content)}{firstUrl && <LinkPreview url={firstUrl} />}</>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <form onSubmit={sendMsg} style={{ padding: 15, backgroundColor: '#202c33', display: 'flex', gap: 10, alignItems: 'flex-end', position: 'relative' }}>
                                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Add Emoji" style={{ backgroundColor: 'transparent', border: '1px solid #8696a0', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: '#8696a0', fontSize: 18, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>😊</button>
                                    <button type="button" onClick={toggleRecording} title={isRecording ? "Stop Recording" : "Record Voice Message"} style={{ backgroundColor: isRecording ? '#ef4444' : 'transparent', border: isRecording ? 'none' : '1px solid #8696a0', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: isRecording ? 'white' : '#8696a0', fontSize: 18, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>{isRecording ? '⏹' : '🎤'}</button>
                                    {showEmojiPicker && <EmojiPicker onSelectEmoji={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />}
                                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#2a3942', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                                        {previewUrl && !isRecording && (
                                            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.2)', backgroundColor: '#1e293b' }}>
                                                <div style={{ fontSize: 12, color: '#8696a0', marginBottom: 6, fontWeight: 'bold', textTransform: 'uppercase' }}>Link Preview</div>
                                                <LinkPreview url={previewUrl} style={{ marginTop: 0 }} />
                                            </div>
                                        )}
                                        <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={handleKey} onPaste={handlePaste} placeholder={isRecording ? t('recording', uiLanguage) : t('messagePlaceholder', uiLanguage)} disabled={isRecording} rows={1} style={{ width: '100%', padding: 12, backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'Segoe UI, sans-serif' }} />
                                    </div>
                                    <button type="submit" disabled={!chatInput.trim() && !isRecording} style={{ backgroundColor: chatInput.trim() ? '#00a884' : '#333', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: chatInput.trim() ? 'pointer' : 'default', color: '#111', fontSize: 18, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>➤</button>
                                </form>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexGrow: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#8696a0', textAlign: 'center', padding: '20px' }}>
                                <div>
                                    <h2 style={{ color: 'white', marginBottom: '10px' }}>TotalRecall</h2>
                                    <p>{t('selectContact', uiLanguage)}</p>
                                </div>
                                <div style={{ margin: '30px 0', width: '40px', height: '1px', backgroundColor: '#222d34' }}></div>
                                <div>
                                    <p style={{ fontSize: '13px', marginBottom: '15px' }}>{t('faceToFace', uiLanguage)}</p>
                                    <button onClick={() => setShowLocalTranslator(true)} style={{ padding: '12px 24px', borderRadius: '24px', backgroundColor: '#00a884', color: '#111', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 168, 132, 0.3)' }}>
                                        {t('openTranslator', uiLanguage)}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div style={{ backgroundColor: '#202c33', padding: '10px 20px', borderTop: '1px solid #222d34', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '13px', color: '#8696a0' }}>
                <span>© NoirSoft Ltd</span>
                <div style={{ display: 'flex', gap: '20px' }}>
                    {isCapitalOlondra && <span>👥 {t('members', uiLanguage)}: {memberCount}</span>}
                    <span>🟢 {t('online', uiLanguage)}: {totalOnlineCount}</span>
                </div>
            </div>
        </div>
    );
}

const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
    @keyframes slideUpFade { 
        from { opacity: 0; transform: translateY(15px); } 
        to { opacity: 1; transform: translateY(0); } 
    }
    @keyframes slideDown { 
        from { transform: translate(-50%, -20px); opacity: 0; } 
        to { transform: translate(-50%, 0); opacity: 1; } 
    }
`;
document.head.appendChild(styleSheet);

// ==========================================
// 📊 VISITOR STATS TRACKING
// ==========================================
export async function recordVisitorData() {
    try {
        const response = await fetch('https://ipinfo.io/json');
        const geoData = await response.json();

        const userAgent = navigator.userAgent;
        const isMobile = /Mobile|Android|iP(hone|od|ad)|IEMobile|BlackBerry/i.test(userAgent);
        const deviceType = isMobile ? 'Mobile' : 'Desktop';

        // Use the existing supabase client instead of a manual fetch
        const { error } = await supabase.from('visitors').insert([{
            ip_address: geoData.ip,
            country: geoData.country,
            device_type: deviceType
        }]);

        if (error) {
            throw error;
        }

    } catch (err) {
        console.error('Analytics error:', err);
    }
}

// ==========================================
// 🛡️ AUTHENTICATION WRAPPER
// ==========================================
export default function App() {
    // NOE @ 27/06/2026 Visitor stats  
    useEffect(() => {
        recordVisitorData();
    }, []);

    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mobile, setMobile] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [error, setError] = useState('');
    const [isSignupMode, setIsSignupMode] = useState(false);
    const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);

    // ✨ UI Language State for entire app
    const [uiLanguage, setUiLanguage] = useState(() => localStorage.getItem('ui_language') || 'en-US');

    const syncProfile = async (currentUser) => {
        if (!currentUser || !currentUser.email) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('email, name, mobile')
                .eq('email', currentUser.email)
                .maybeSingle();

            const metaName = currentUser.user_metadata?.name || currentUser.email.split('@')[0];
            const metaMobile = currentUser.user_metadata?.mobile || '';

            if (!data && !error) {
                await supabase.from('profiles').insert([{
                    email: currentUser.email,
                    name: metaName,
                    mobile: metaMobile
                }]);
            } else if (data && (!data.name || !data.mobile)) {
                await supabase.from('profiles')
                    .update({
                        name: data.name || metaName,
                        mobile: data.mobile || metaMobile
                    })
                    .eq('email', currentUser.email);
            }
        } catch (err) {
            console.error("Error syncing profile:", err);
        }
    };

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    console.error("Session error caught:", error.message);
                    await supabase.auth.signOut();
                    setUser(null);
                } else if (data?.session?.user) {
                    setUser(data.session.user);
                    syncProfile(data.session.user);
                }
            } catch (err) {
                console.error("Unexpected session error:", err);
                await supabase.auth.signOut();
                setUser(null);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setUser(null);
            } else if (session?.user) {
                setUser(session.user);
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    syncProfile(session.user);
                }
            }

            if (event === 'PASSWORD_RECOVERY') {
                const newPassword = prompt("Please enter your new password (minimum 6 characters):");
                if (newPassword && newPassword.length >= 6) {
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) {
                        alert("Failed to update password: " + error.message);
                    } else {
                        alert("Password updated successfully!");
                    }
                } else {
                    alert("Password update cancelled or invalid. Please try resetting again if needed.");
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const auth = async (e, type) => {
        e.preventDefault();
        setError('');

        if (type === 'reset') {
            if (!email.trim()) {
                setError("Please enter your email address");
                return;
            }
            setLoading(true);
            try {
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: window.location.origin,
                });
                if (error) throw new Error(error.message);
                setConfirmMessage(t('checkEmail', uiLanguage) + " - we've sent you a password reset link.");
                setShowConfirm(true);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
            return;
        }

        if (type === 'login' && (!email || !password)) {
            setError("Please fill in all fields");
            return;
        }

        if (type === 'signup' && (!email || !password || !mobile.trim())) {
            setError("Please fill in all fields, including your mobile number");
            return;
        }

        if (type === 'signup' && password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        setLoading(true);
        try {
            if (type === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (error) throw new Error(error.message.includes('Invalid login credentials') ? "Invalid email or password. Please try again." : error.message);
                if (data?.user) setUser(data.user);
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            name: email.split('@')[0],
                            mobile: mobile.trim()
                        }
                    }
                });

                const isExistingUser = (error && error.message.includes('User already registered')) ||
                    (data?.user && data.user.identities && data.user.identities.length === 0);

                if (isExistingUser) {
                    throw new Error("This email is already registered. Please log in instead.");
                } else if (error) {
                    throw new Error(error.message);
                }

                if (data?.user) {
                    if (data.session) setUser(data.user);
                    else {
                        setConfirmMessage("We've sent you a confirmation link.");
                        setShowConfirm(true);
                        setEmail(''); setPassword(''); setMobile('');
                    }
                }
            }
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    if (user) return <ChatApp user={user} onLogout={() => supabase.auth.signOut()} uiLanguage={uiLanguage} setUiLanguage={setUiLanguage} />;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', backgroundColor: '#111b21', color: 'white', fontFamily: 'Segoe UI', position: 'relative' }}>

            {/* Top Right UI Language Selector */}
            <div style={{ position: 'absolute', top: 20, right: 20 }}>
                <select
                    value={uiLanguage}
                    onChange={(e) => {
                        setUiLanguage(e.target.value);
                        localStorage.setItem('ui_language', e.target.value);
                    }}
                    style={{ padding: '8px 12px', borderRadius: '8px', background: '#2a3942', color: 'white', border: '1px solid #00a884', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    <LanguageOptions />
                </select>
            </div>

            <div style={{ backgroundColor: '#202c33', padding: 40, borderRadius: 8, width: 350, maxWidth: '90%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <h2 style={{ color: '#00a884', marginBottom: 30 }}>TotalRecall</h2>
                {error && <div style={{ backgroundColor: '#dc2626', color: 'white', padding: 10, borderRadius: 4, marginBottom: 15, wordWrap: 'break-word' }}>{error}</div>}

                {showConfirm ? (
                    <div>
                        <h3>{t('checkEmail', uiLanguage)}</h3>
                        <p style={{ color: '#8696a0', marginBottom: 20 }}>{confirmMessage}</p>
                        <button onClick={() => { setShowConfirm(false); setEmail(''); setPassword(''); setMobile(''); setError(''); setIsSignupMode(false); setIsForgotPasswordMode(false); }} style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>{t('backLogin', uiLanguage)}</button>
                    </div>
                ) : isForgotPasswordMode ? (
                    <form onSubmit={e => e.preventDefault()}>
                        <p style={{ color: '#8696a0', marginBottom: 15, fontSize: '14px' }}>{t('resetMsg', uiLanguage)}</p>
                        <input type="email" placeholder={t('email', uiLanguage)} value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 15, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} disabled={loading} />

                        <button onClick={e => auth(e, 'reset')} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', marginBottom: 10, opacity: loading ? 0.5 : 1 }}>
                            {loading ? t('sending', uiLanguage) : t('sendReset', uiLanguage)}
                        </button>
                        <button onClick={() => { setIsForgotPasswordMode(false); setError(''); }} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: 'transparent', color: '#8696a0', border: '1px solid #8696a0', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>
                            {t('backLogin', uiLanguage)}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={e => e.preventDefault()}>
                        <input type="email" placeholder={t('email', uiLanguage)} value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 15, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} disabled={loading} />

                        {isSignupMode && (
                            <input type="tel" placeholder={t('mobile', uiLanguage)} value={mobile} onChange={e => setMobile(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 15, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} disabled={loading} required />
                        )}

                        <input type="password" placeholder={t('password', uiLanguage)} value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 20, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} disabled={loading} />

                        {!isSignupMode ? (
                            <>
                                <button onClick={e => auth(e, 'login')} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', marginBottom: 10, opacity: loading ? 0.5 : 1 }}>{loading ? t('loading', uiLanguage) : t('login', uiLanguage)}</button>
                                <button onClick={() => { setIsSignupMode(true); setError(''); }} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: 'transparent', color: '#00a884', border: '1px solid #00a884', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>{t('signup', uiLanguage)}</button>
                                <button onClick={() => { setIsForgotPasswordMode(true); setError(''); setIsSignupMode(false); }} style={{ width: '100%', padding: 12, backgroundColor: 'transparent', color: '#8696a0', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '10px', textDecoration: 'underline' }} disabled={loading}>
                                    {t('forgotPwd', uiLanguage)}
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={e => auth(e, 'signup')} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', marginBottom: 10, opacity: loading ? 0.5 : 1 }}>{loading ? t('loading', uiLanguage) : t('createAcc', uiLanguage)}</button>
                                <button onClick={() => { setIsSignupMode(false); setError(''); }} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: 'transparent', color: '#8696a0', border: '1px solid #8696a0', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>{t('backLogin', uiLanguage)}</button>
                            </>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}