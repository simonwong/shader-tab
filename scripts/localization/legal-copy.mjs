export const legalCopy = {
  en: {
    name: 'English',
    privacy: 'Privacy policy',
    licenses: 'Third-party licenses',
    date: 'Effective September 21, 2026',
    description:
      'A calm new tab with your bookmarks, personal favorites, and ambient glass effects.',
    intro:
      'Shader Tab displays bookmarks, favorites and animated backgrounds locally in your browser. The extension does not upload bookmarks, favorites or usage records to the developer or third-party servers.',
    dataHeading: 'Data used',
    data: [
      'Chrome bookmark titles, URLs, folder structure, creation dates and last-opened dates provided by Chrome: for browsing, searching and sorting.',
      'Your chosen favorite bookmark IDs and their order: for displaying favorites.',
      'Language, theme, background categories, shuffle queues, sorting, control visibility and hide delay: to save your preferences.',
      'Chrome’s existing favicon cache: to display icons for bookmarks currently shown.',
    ],
    excluded:
      'The extension does not read webpage contents, passwords, cookies or complete browsing history, or record which bookmarks you open. It has no accounts, ads, analytics or trackers.',
    permissionsHeading: 'Permissions',
    permissions: [
      'Read bookmarks and listen for changes. The extension does not create, edit or delete Chrome bookmarks.',
      'Save favorites and preferences in the current browser profile.',
      'Read Chrome’s local favicon cache. The extension does not crawl websites in bulk or use third-party icon services.',
    ],
    storageHeading: 'Storage, sharing and retention',
    storage: [
      'Favorites and preferences stay in local extension storage in this browser profile. The extension does not sync them across devices. Chrome manages its original bookmarks and its own sync features.',
      'The developer does not receive, sell, share or use this local data for advertising. It remains until you change settings, remove favorites, clear extension data or uninstall the extension. Uninstalling removes extension data, but does not delete Chrome bookmarks.',
    ],
    externalHeading: 'Websites and support',
    external: [
      'Clicking a bookmark or background source link opens the website you chose. Its own privacy policy applies; Shader Tab does not attach your favorites list or other bookmarks.',
      'If you email support, we receive the email address, message and attachments you provide, only to handle your request, not for advertising. Do not send passwords or other sensitive information. You can ask us at the same address to delete personal information in support messages, except where retention is legally required. Email is handled by an email service provider.',
    ],
    choicesHeading: 'Your choices',
    choices:
      'You can remove favorites, change preferences or hide bookmark controls in Settings, or disable or uninstall Shader Tab in Chrome. Hiding controls changes only their visibility and does not erase saved favorites or preferences.',
    updatesHeading: 'Policy updates',
    updates:
      'Updates change the effective date. Material changes to data processing will be explained before the relevant feature is enabled, with consent obtained where required.',
    contactHeading: 'Contact',
    contact: 'Shader Tab developer:',
    compliance:
      'Use and transfer of information received from Google APIs follow the Chrome Web Store User Data Policy, including its Limited Use requirements.',
    licenseIntro:
      'Thanks to the authors and contributors of these projects. Their full licenses govern copyright and usage conditions.',
    dependencies: 'Application dependencies',
    notices: 'Copyright and full license notices for bundled dependencies',
    versions: 'Version inventory',
    inventory:
      'The inventory is generated from modules included in the build, covering runtime dependencies such as React, Base UI, dnd-kit, Hugeicons and Three.js.',
    embedded: 'Additional notices for embedded dependencies',
    embeddedNote:
      'URL utilities and three-stdlib embedded in Shader Gradient, and React reconciler embedded in Fiber. See below for camera-controls and GLSL noise.',
    backgrounds: 'Backgrounds and fonts',
    adaptations:
      'Local adaptations of ThreeUI cover rendering lifecycle, frame rate and resolution budgets, pointer interactions and decorative text.',
  },
  // zh-CN pages are published at the extension root (privacy.html, licenses.html).
  // `colon` replaces the default ': ' after permission names and the embedded-notice link.
  'zh-CN': {
    name: '简体中文',
    privacy: '隐私政策',
    licenses: '第三方许可',
    date: '生效日期：2026 年 9 月 21 日',
    description: '用动态玻璃背景、Chrome 书签与个人收藏，打造安静的新标签页。',
    colon: '：',
    intro:
      'Shader Tab 在浏览器本地展示书签、收藏和动态背景。扩展不会向开发者或第三方服务器上传书签、收藏或使用记录。',
    dataHeading: '处理哪些数据',
    data: [
      'Chrome 书签的名称、网址、文件夹结构、添加时间，以及 Chrome 提供的最近打开时间：用于浏览、搜索和排序书签。',
      '你选择的常用书签 ID 与排列顺序：用于显示收藏。',
      '语言、主题、背景类别、随机队列、排序方式、入口显示与隐藏延迟：用于保存偏好。',
      'Chrome 已有的网页图标缓存：用于显示当前展开的书签图标。',
    ],
    excluded:
      '扩展不读取网页正文、账号密码、Cookie 或完整浏览历史，不记录你打开了哪些书签。不设账户、广告、分析统计或追踪器。',
    permissionsHeading: '权限用途',
    permissions: [
      '读取并监听 Chrome 书签变化。扩展不创建、修改或删除你的 Chrome 书签。',
      '在当前浏览器配置中保存收藏和偏好。',
      '读取 Chrome 的本地图标缓存。扩展不批量抓取网站，也不调用第三方图标服务。',
    ],
    storageHeading: '存储、共享与保留',
    storage: [
      '收藏和偏好仅保存在当前浏览器配置的本地扩展存储中，不通过扩展跨设备同步。Chrome 原始书签和它自身的同步功能由 Chrome 管理。',
      '开发者不会收到、出售、共享或将这些本地数据用于广告。数据在本地保留，直到你修改设置、移除收藏、清除扩展数据或卸载扩展。卸载扩展会移除扩展自身的本地数据，不会删除 Chrome 原始书签。',
    ],
    externalHeading: '打开网站与联系支持',
    external: [
      '点击书签或背景来源链接后，浏览器会访问你选择的网站。该网站按自身隐私政策处理访问数据；Shader Tab 不向其附加你的收藏列表或其他书签。',
      '如果你主动通过邮件联系支持，我们会收到你提供的邮箱地址、邮件内容及附件，仅用于处理你的请求，不用于广告。不要在支持邮件中发送密码等敏感信息；可通过同一邮箱请求删除支持通信中你提供的个人信息，法律要求保留的情况除外。邮件由邮件服务提供商处理。',
    ],
    choicesHeading: '你的选择',
    choices:
      '你可以在设置中移除常用书签、改变偏好或隐藏书签入口，也可以在 Chrome 扩展管理页禁用或卸载 Shader Tab。隐藏入口只改变展示，不会清空已保存的收藏或偏好。',
    updatesHeading: '政策更新',
    updates:
      '政策更新时会修改生效日期。若数据处理方式发生实质变化，会在相关功能启用前作出说明，并按适用要求取得同意。',
    contactHeading: '联系',
    contact: 'Shader Tab 开发者：',
    compliance:
      '对通过 Google API 获得的信息的使用和转移遵循 Chrome Web Store 用户数据政策，包括 Limited Use 要求。',
    licenseIntro: '感谢以下项目的作者与贡献者。各项目的版权及使用条件以对应许可全文为准。',
    dependencies: '应用依赖',
    notices: '已打包依赖的版权与完整许可声明',
    versions: '版本清单',
    inventory:
      '该清单由构建时实际包含的模块生成，涵盖 React、Base UI、dnd-kit、Hugeicons、Three.js 等运行时依赖。',
    embedded: '预打包依赖的补充许可',
    embeddedNote:
      'Shader Gradient 内嵌的 URL 工具与 three-stdlib，以及 Fiber 内嵌的 React reconciler。camera-controls 与 GLSL noise 的声明见下方。',
    backgrounds: '背景与字体',
    adaptations: 'ThreeUI 的本地适配包括渲染生命周期、帧率和分辨率预算、指针交互与装饰文案。',
  },
  'zh-TW': {
    name: '繁體中文',
    privacy: '隱私權政策',
    licenses: '第三方授權',
    date: '生效日期：2026 年 9 月 21 日',
    description: '以動態玻璃背景、Chrome 書籤與個人收藏，打造寧靜的新分頁。',
    intro:
      'Shader Tab 在瀏覽器本機顯示書籤、收藏與動態背景。擴充功能不會向開發者或第三方伺服器上傳書籤、收藏或使用紀錄。',
    dataHeading: '處理哪些資料',
    data: [
      'Chrome 書籤的名稱、網址、資料夾結構、加入時間及 Chrome 提供的最近開啟時間：用於瀏覽、搜尋與排序。',
      '你選擇的常用書籤 ID 與排列順序：用於顯示收藏。',
      '語言、主題、背景類別、隨機佇列、排序方式、入口顯示與隱藏延遲：用於儲存偏好。',
      'Chrome 現有的網站圖示快取：用於顯示目前展開的書籤圖示。',
    ],
    excluded:
      '擴充功能不讀取網頁正文、帳號密碼、Cookie 或完整瀏覽紀錄，也不記錄你開啟哪些書籤。不設帳戶、廣告、分析統計或追蹤器。',
    permissionsHeading: '權限用途',
    permissions: [
      '讀取並監聽 Chrome 書籤變更，不建立、修改或刪除 Chrome 書籤。',
      '在目前的瀏覽器設定檔中儲存收藏與偏好。',
      '讀取 Chrome 本機圖示快取，不批次擷取網站，也不使用第三方圖示服務。',
    ],
    storageHeading: '儲存、分享與保留',
    storage: [
      '收藏與偏好僅存在目前瀏覽器設定檔的本機擴充功能儲存空間，不由擴充功能跨裝置同步。Chrome 原始書籤與其同步功能由 Chrome 管理。',
      '開發者不會接收、出售、分享這些本機資料或將其用於廣告。資料保留至你修改設定、移除收藏、清除擴充功能資料或解除安裝。解除安裝會移除擴充功能資料，但不會刪除 Chrome 原始書籤。',
    ],
    externalHeading: '網站與支援',
    external: [
      '點擊書籤或背景來源連結會開啟你選擇的網站，該網站適用自身的隱私權政策。Shader Tab 不附加你的收藏清單或其他書籤。',
      '若你主動寄信聯絡支援，我們會收到你提供的電子郵件地址、內容與附件，僅用於處理請求，不用於廣告。請勿寄送密碼等敏感資料。你可透過同一信箱要求刪除支援通信中的個人資料，法律要求保留者除外。郵件由郵件服務供應商處理。',
    ],
    choicesHeading: '你的選擇',
    choices:
      '你可在設定中移除常用書籤、改變偏好或隱藏入口，也可在 Chrome 停用或解除安裝 Shader Tab。隱藏入口不會清除已儲存的收藏或偏好。',
    updatesHeading: '政策更新',
    updates:
      '更新時會變更生效日期。資料處理方式如有重大變化，會在相關功能啟用前說明，並依適用要求取得同意。',
    contactHeading: '聯絡',
    contact: 'Shader Tab 開發者：',
    compliance:
      '透過 Google API 取得之資訊，其使用與移轉遵循 Chrome Web Store 使用者資料政策，包括 Limited Use 要求。',
    licenseIntro: '感謝以下專案的作者與貢獻者。各專案的著作權與使用條件以授權全文為準。',
    dependencies: '應用程式相依套件',
    notices: '已打包套件的著作權與完整授權聲明',
    versions: '版本清單',
    inventory:
      '清單依建置時實際包含的模組產生，涵蓋 React、Base UI、dnd-kit、Hugeicons、Three.js 等執行時套件。',
    embedded: '內嵌套件的補充授權',
    embeddedNote:
      'Shader Gradient 內嵌的 URL 工具與 three-stdlib，以及 Fiber 內嵌的 React reconciler。camera-controls 與 GLSL noise 聲明見下方。',
    backgrounds: '背景與字型',
    adaptations: 'ThreeUI 的本機調整涵蓋渲染生命週期、畫格率、解析度預算、游標互動與裝飾文案。',
  },
  ja: {
    name: '日本語',
    privacy: 'プライバシーポリシー',
    licenses: 'サードパーティーライセンス',
    date: '施行日：2026 年 9 月 21 日',
    description: 'ブックマーク、お気に入り、動くガラス風背景で、落ち着いた新しいタブを。',
    intro:
      'Shader Tab はブックマーク、お気に入り、動く背景をブラウザ内で表示します。拡張機能はブックマーク、お気に入り、利用記録を開発者や第三者のサーバーへ送信しません。',
    dataHeading: '使用するデータ',
    data: [
      'Chrome ブックマークの名前、URL、フォルダ構造、追加日時、Chrome が提供する最終利用日時：閲覧、検索、並べ替えに使用します。',
      '選択したお気に入りのブックマーク ID と順序：お気に入りの表示に使用します。',
      '言語、テーマ、背景カテゴリ、抽選順序、並べ替え、ボタン表示、非表示までの時間：設定の保存に使用します。',
      'Chrome の既存の favicon キャッシュ：表示中のブックマークのアイコンに使用します。',
    ],
    excluded:
      'ウェブページ本文、パスワード、Cookie、完全な閲覧履歴は読み取りません。開いたブックマークも記録しません。アカウント、広告、利用分析、トラッカーはありません。',
    permissionsHeading: '権限の用途',
    permissions: [
      'Chrome ブックマークを読み取り、変更を検知します。作成、編集、削除はしません。',
      '現在のブラウザプロファイルにお気に入りと設定を保存します。',
      'Chrome のローカルアイコンキャッシュを読み取ります。ウェブサイトの一括取得や第三者のアイコンサービスは利用しません。',
    ],
    storageHeading: '保存・共有・保持',
    storage: [
      'お気に入りと設定は現在のブラウザプロファイルの拡張機能用ローカルストレージにのみ保存します。拡張機能による端末間同期はありません。元のブックマークと Chrome 自身の同期は Chrome が管理します。',
      '開発者はこのローカルデータを受信、販売、共有したり、広告に使用したりしません。設定変更、お気に入りの削除、拡張機能データの消去、アンインストールまで保持します。アンインストールは拡張機能のデータを削除しますが、Chrome のブックマークは削除しません。',
    ],
    externalHeading: 'ウェブサイトとサポート',
    external: [
      'ブックマークや背景の出典リンクをクリックすると、選んだサイトを開きます。そのサイトのポリシーが適用されます。Shader Tab はお気に入り一覧や他のブックマークを付加しません。',
      'サポートにメールを送ると、提供されたアドレス、本文、添付ファイルを受信します。問い合わせ対応のみに使用し、広告には使用しません。パスワード等の機密情報を送らないでください。同じアドレスで通信中の個人情報の削除を依頼できます。ただし法令で保持が必要な場合を除きます。メールはメールサービス事業者が処理します。',
    ],
    choicesHeading: '選択と管理',
    choices:
      '設定でお気に入りを削除し、設定やボタン表示を変更できます。Chrome で拡張機能を無効化または削除できます。ボタンを隠しても保存したお気に入りや設定は消えません。',
    updatesHeading: 'ポリシーの更新',
    updates:
      '更新時は施行日を変更します。データ処理に重要な変更がある場合、関連機能の有効化前に説明し、必要に応じて同意を得ます。',
    contactHeading: 'お問い合わせ',
    contact: 'Shader Tab 開発者：',
    compliance:
      'Google API から取得した情報の使用と転送は、Limited Use 要件を含む Chrome Web Store のユーザーデータポリシーに従います。',
    licenseIntro:
      '各プロジェクトの作者と貢献者に感謝します。著作権と利用条件は各ライセンス全文に従います。',
    dependencies: 'アプリの依存ライブラリ',
    notices: '同梱ライブラリの著作権とライセンス全文',
    versions: 'バージョン一覧',
    inventory:
      '一覧はビルドに含まれるモジュールから生成され、React、Base UI、dnd-kit、Hugeicons、Three.js 等を含みます。',
    embedded: '内蔵ライブラリの追加ライセンス',
    embeddedNote:
      'Shader Gradient 内蔵の URL ツールと three-stdlib、および Fiber 内蔵の React reconciler。camera-controls と GLSL noise は以下を参照してください。',
    backgrounds: '背景とフォント',
    adaptations:
      'ThreeUI の調整は描画ライフサイクル、フレームレートと解像度の制限、ポインター操作、装飾文を含みます。',
  },
  ko: {
    name: '한국어',
    privacy: '개인정보 처리방침',
    licenses: '타사 라이선스',
    date: '시행일: 2026년 9월 21일',
    description: '북마크, 즐겨찾기와 움직이는 유리 배경으로 차분한 새 탭을 만드세요.',
    intro:
      'Shader Tab은 브라우저 안에서 북마크, 즐겨찾기, 움직이는 배경을 표시합니다. 확장 프로그램은 북마크, 즐겨찾기 또는 사용 기록을 개발자나 타사 서버에 업로드하지 않습니다.',
    dataHeading: '사용하는 데이터',
    data: [
      'Chrome 북마크 이름, URL, 폴더 구조, 추가 날짜 및 Chrome이 제공하는 최근 열람 날짜: 탐색, 검색, 정렬에 사용합니다.',
      '선택한 즐겨찾기의 북마크 ID와 순서: 즐겨찾기 표시에 사용합니다.',
      '언어, 테마, 배경 종류, 무작위 순서, 정렬, 버튼 표시 및 숨기기 지연: 설정 저장에 사용합니다.',
      'Chrome의 기존 favicon 캐시: 현재 표시 중인 북마크 아이콘에 사용합니다.',
    ],
    excluded:
      '웹페이지 본문, 비밀번호, 쿠키 또는 전체 방문 기록을 읽지 않으며 어떤 북마크를 열었는지 기록하지 않습니다. 계정, 광고, 분석 또는 추적기가 없습니다.',
    permissionsHeading: '권한 사용',
    permissions: [
      'Chrome 북마크를 읽고 변경을 감지합니다. 북마크를 만들거나 수정하거나 삭제하지 않습니다.',
      '현재 브라우저 프로필에 즐겨찾기와 설정을 저장합니다.',
      'Chrome의 로컬 아이콘 캐시를 읽습니다. 웹사이트를 일괄 수집하거나 타사 아이콘 서비스를 사용하지 않습니다.',
    ],
    storageHeading: '저장, 공유 및 보관',
    storage: [
      '즐겨찾기와 설정은 현재 브라우저 프로필의 확장 프로그램 로컬 저장소에만 보관되며 확장 프로그램을 통한 기기 간 동기화는 없습니다. 원래 북마크와 Chrome 자체 동기화는 Chrome에서 관리합니다.',
      '개발자는 이 로컬 데이터를 받거나 판매, 공유하거나 광고에 사용하지 않습니다. 설정 변경, 즐겨찾기 삭제, 확장 프로그램 데이터 삭제 또는 제거 시까지 보관합니다. 확장 프로그램을 제거하면 확장 프로그램 데이터만 삭제되며 Chrome 북마크는 삭제되지 않습니다.',
    ],
    externalHeading: '웹사이트 및 지원',
    external: [
      '북마크나 배경 출처 링크를 클릭하면 선택한 웹사이트를 엽니다. 해당 사이트의 개인정보 처리방침이 적용됩니다. Shader Tab은 즐겨찾기 목록이나 다른 북마크를 덧붙이지 않습니다.',
      '지원 이메일을 보내면 제공한 이메일 주소, 본문 및 첨부 파일을 받습니다. 요청 처리에만 사용하며 광고에는 사용하지 않습니다. 비밀번호 등 민감한 정보를 보내지 마세요. 같은 주소로 지원 메시지의 개인정보 삭제를 요청할 수 있으며 법적 보관 의무가 있으면 예외입니다. 이메일은 이메일 서비스 제공업체가 처리합니다.',
    ],
    choicesHeading: '사용자 선택',
    choices:
      '설정에서 즐겨찾기를 삭제하거나 설정을 바꾸거나 버튼을 숨길 수 있습니다. Chrome에서 확장 프로그램을 비활성화하거나 제거할 수 있습니다. 버튼을 숨겨도 저장한 즐겨찾기나 설정은 삭제되지 않습니다.',
    updatesHeading: '정책 변경',
    updates:
      '정책 변경 시 시행일을 수정합니다. 데이터 처리에 중요한 변경이 있으면 기능 활성화 전에 안내하고 필요한 동의를 받습니다.',
    contactHeading: '문의',
    contact: 'Shader Tab 개발자:',
    compliance:
      'Google API에서 받은 정보의 사용과 전송은 Limited Use 요건을 포함한 Chrome Web Store 사용자 데이터 정책을 따릅니다.',
    licenseIntro:
      '각 프로젝트의 저자와 기여자에게 감사드립니다. 저작권과 이용 조건은 해당 라이선스 전문을 따릅니다.',
    dependencies: '앱 의존성',
    notices: '포함된 의존성의 저작권 및 전체 라이선스',
    versions: '버전 목록',
    inventory:
      '실제 빌드에 포함된 모듈에서 생성한 목록으로 React, Base UI, dnd-kit, Hugeicons, Three.js 등의 런타임 의존성을 포함합니다.',
    embedded: '내장 의존성 추가 라이선스',
    embeddedNote:
      'Shader Gradient에 내장된 URL 도구와 three-stdlib 및 Fiber에 내장된 React reconciler. camera-controls와 GLSL noise는 아래를 참조하세요.',
    backgrounds: '배경 및 글꼴',
    adaptations:
      'ThreeUI의 로컬 수정에는 렌더링 수명 주기, 프레임 속도와 해상도 한도, 포인터 상호작용 및 장식 문구가 포함됩니다.',
  },
  fr: {
    name: 'Français',
    privacy: 'Politique de confidentialité',
    licenses: 'Licences tierces',
    date: 'En vigueur le 21 septembre 2026',
    description:
      'Un nouvel onglet apaisant avec vos favoris Chrome, vos pages préférées et des effets de verre animés.',
    intro:
      'Shader Tab affiche les favoris et les arrière-plans animés localement dans votre navigateur. L’extension n’envoie pas vos favoris ni vos données d’utilisation au développeur ou à des serveurs tiers.',
    dataHeading: 'Données utilisées',
    data: [
      'Titres, URL, arborescence, dates d’ajout et de dernière ouverture fournies par Chrome : pour parcourir, rechercher et trier les favoris.',
      'Identifiants et ordre des favoris épinglés : pour les afficher.',
      'Langue, thème, catégories de fonds, files de tirage, tri, visibilité des boutons et délai de masquage : pour enregistrer vos préférences.',
      'Cache favicon existant de Chrome : pour les icônes des favoris affichés.',
    ],
    excluded:
      'L’extension ne lit ni le contenu des pages, ni les mots de passe, cookies ou historique complet, et ne consigne pas les favoris ouverts. Elle ne propose aucun compte, publicité, outil d’analyse ou traceur.',
    permissionsHeading: 'Autorisations',
    permissions: [
      'Lire les favoris Chrome et suivre leurs changements, sans les créer, modifier ou supprimer.',
      'Enregistrer les favoris épinglés et les préférences dans le profil actuel.',
      'Lire le cache local des icônes Chrome, sans collecte massive de sites ni service tiers d’icônes.',
    ],
    storageHeading: 'Stockage, partage et conservation',
    storage: [
      'Les favoris épinglés et les préférences restent dans le stockage local de l’extension du profil actuel, sans synchronisation entre appareils par l’extension. Chrome gère ses favoris d’origine et sa propre synchronisation.',
      'Le développeur ne reçoit, ne vend, ne partage ni n’utilise ces données locales pour la publicité. Elles restent jusqu’à leur modification, au retrait de favoris, à l’effacement des données ou à la désinstallation. Désinstaller supprime les données de l’extension, pas les favoris Chrome.',
    ],
    externalHeading: 'Sites et assistance',
    external: [
      'Cliquer sur un favori ou une source de fond ouvre le site choisi, soumis à sa propre politique. Shader Tab n’y joint pas votre liste de favoris ni d’autres favoris.',
      'Si vous contactez l’assistance par e-mail, nous recevons l’adresse, le message et les pièces jointes fournis, uniquement pour traiter votre demande, sans publicité. N’envoyez pas de mots de passe ou d’informations sensibles. Vous pouvez demander à la même adresse la suppression des données personnelles de vos échanges, sauf obligation légale de conservation. Un prestataire de messagerie traite les e-mails.',
    ],
    choicesHeading: 'Vos choix',
    choices:
      'Vous pouvez retirer des favoris épinglés, changer les préférences ou masquer les boutons dans les paramètres, ou désactiver et désinstaller Shader Tab dans Chrome. Masquer les boutons n’efface pas les favoris ou préférences enregistrés.',
    updatesHeading: 'Mises à jour',
    updates:
      'La date d’entrée en vigueur change lors des mises à jour. Tout changement important du traitement sera expliqué avant l’activation de la fonction, avec consentement lorsque requis.',
    contactHeading: 'Contact',
    contact: 'Développeur de Shader Tab :',
    compliance:
      'L’utilisation et le transfert des informations reçues via les API Google respectent les règles relatives aux données utilisateur du Chrome Web Store, y compris les exigences Limited Use.',
    licenseIntro:
      'Merci aux auteurs et contributeurs de ces projets. Les licences intégrales régissent les droits d’auteur et les conditions d’utilisation.',
    dependencies: 'Dépendances de l’application',
    notices: 'Droits d’auteur et licences intégrales des dépendances incluses',
    versions: 'Liste des versions',
    inventory:
      'La liste est générée à partir des modules inclus dans la compilation : React, Base UI, dnd-kit, Hugeicons, Three.js et autres dépendances d’exécution.',
    embedded: 'Licences complémentaires des dépendances embarquées',
    embeddedNote:
      'Outils URL et three-stdlib embarqués dans Shader Gradient, et React reconciler embarqué dans Fiber. Voir ci-dessous pour camera-controls et GLSL noise.',
    backgrounds: 'Fonds et polices',
    adaptations:
      'Les adaptations locales de ThreeUI concernent le cycle de rendu, les limites de fréquence et de résolution, les interactions du pointeur et les textes décoratifs.',
  },
  de: {
    name: 'Deutsch',
    privacy: 'Datenschutzerklärung',
    licenses: 'Drittanbieter-Lizenzen',
    date: 'Gültig ab 21. September 2026',
    description:
      'Ein ruhiger neuer Tab mit Lesezeichen, persönlichen Favoriten und animierten Glaseffekten.',
    intro:
      'Shader Tab zeigt Lesezeichen, Favoriten und animierte Hintergründe lokal im Browser. Die Erweiterung überträgt keine Lesezeichen, Favoriten oder Nutzungsdaten an den Entwickler oder Drittserver.',
    dataHeading: 'Verwendete Daten',
    data: [
      'Titel, URLs, Ordnerstruktur, Erstellungsdatum und von Chrome bereitgestellte letzte Öffnungszeit der Lesezeichen: zum Durchsuchen, Suchen und Sortieren.',
      'IDs und Reihenfolge ausgewählter Favoriten: zur Anzeige.',
      'Sprache, Design, Hintergrundkategorien, Zufallswarteschlangen, Sortierung, Schaltflächensichtbarkeit und Ausblendverzögerung: zum Speichern Ihrer Einstellungen.',
      'Vorhandener Favicon-Cache von Chrome: für Symbole der angezeigten Lesezeichen.',
    ],
    excluded:
      'Die Erweiterung liest weder Seiteninhalte noch Passwörter, Cookies oder den vollständigen Browserverlauf und protokolliert keine geöffneten Lesezeichen. Es gibt keine Konten, Werbung, Nutzungsanalyse oder Tracker.',
    permissionsHeading: 'Berechtigungen',
    permissions: [
      'Chrome-Lesezeichen lesen und Änderungen erkennen, ohne sie anzulegen, zu ändern oder zu löschen.',
      'Favoriten und Einstellungen im aktuellen Browserprofil speichern.',
      'Lokalen Symbolcache von Chrome lesen, ohne Websites massenhaft abzurufen oder Symbolanbieter Dritter zu nutzen.',
    ],
    storageHeading: 'Speicherung, Weitergabe und Aufbewahrung',
    storage: [
      'Favoriten und Einstellungen bleiben im lokalen Erweiterungsspeicher des aktuellen Profils. Die Erweiterung synchronisiert sie nicht zwischen Geräten. Chrome verwaltet seine ursprünglichen Lesezeichen und eigene Synchronisierung.',
      'Der Entwickler erhält, verkauft oder teilt diese lokalen Daten nicht und nutzt sie nicht für Werbung. Sie bleiben bis zur Änderung, Entfernung von Favoriten, Löschung der Erweiterungsdaten oder Deinstallation gespeichert. Die Deinstallation entfernt Erweiterungsdaten, keine Chrome-Lesezeichen.',
    ],
    externalHeading: 'Websites und Support',
    external: [
      'Ein Klick auf ein Lesezeichen oder eine Hintergrundquelle öffnet die gewählte Website. Deren Datenschutzerklärung gilt. Shader Tab fügt keine Favoritenliste oder anderen Lesezeichen hinzu.',
      'Bei einer Support-E-Mail erhalten wir die angegebene Adresse, Nachricht und Anhänge ausschließlich zur Bearbeitung Ihrer Anfrage, nicht für Werbung. Senden Sie keine Passwörter oder sensiblen Angaben. Sie können unter derselben Adresse die Löschung personenbezogener Daten in Support-Nachrichten verlangen, sofern keine gesetzliche Aufbewahrungspflicht besteht. Ein E-Mail-Dienstleister verarbeitet die Nachrichten.',
    ],
    choicesHeading: 'Ihre Möglichkeiten',
    choices:
      'In den Einstellungen können Sie Favoriten entfernen, Einstellungen ändern oder Schaltflächen ausblenden. In Chrome können Sie Shader Tab deaktivieren oder deinstallieren. Ausblenden löscht keine gespeicherten Favoriten oder Einstellungen.',
    updatesHeading: 'Änderungen dieser Erklärung',
    updates:
      'Bei Änderungen wird das Gültigkeitsdatum angepasst. Wesentliche Änderungen der Datenverarbeitung werden vor Aktivierung der Funktion erklärt; erforderliche Einwilligungen werden eingeholt.',
    contactHeading: 'Kontakt',
    contact: 'Shader Tab Entwickler:',
    compliance:
      'Nutzung und Übertragung von Informationen aus Google-APIs entsprechen der Nutzerdatenrichtlinie des Chrome Web Store einschließlich der Limited-Use-Anforderungen.',
    licenseIntro:
      'Vielen Dank an die Autoren und Mitwirkenden dieser Projekte. Für Urheberrechte und Nutzungsbedingungen gelten die vollständigen Lizenzen.',
    dependencies: 'Abhängigkeiten der Anwendung',
    notices: 'Urheberrechtsvermerke und vollständige Lizenzen gebündelter Abhängigkeiten',
    versions: 'Versionsübersicht',
    inventory:
      'Die Liste wird aus den tatsächlich eingebundenen Modulen erstellt und umfasst React, Base UI, dnd-kit, Hugeicons, Three.js und weitere Laufzeitabhängigkeiten.',
    embedded: 'Zusätzliche Lizenzen eingebetteter Abhängigkeiten',
    embeddedNote:
      'URL-Werkzeuge und three-stdlib in Shader Gradient sowie React reconciler in Fiber. camera-controls und GLSL noise stehen unten.',
    backgrounds: 'Hintergründe und Schriften',
    adaptations:
      'Lokale Anpassungen von ThreeUI betreffen Render-Lebenszyklus, Bildraten- und Auflösungsgrenzen, Zeigerinteraktionen und dekorative Texte.',
  },
  es: {
    name: 'Español',
    privacy: 'Política de privacidad',
    licenses: 'Licencias de terceros',
    date: 'Vigente desde el 21 de septiembre de 2026',
    description:
      'Una nueva pestaña tranquila con marcadores, favoritos personales y efectos de cristal animados.',
    intro:
      'Shader Tab muestra marcadores, favoritos y fondos animados localmente en el navegador. La extensión no sube marcadores, favoritos ni registros de uso al desarrollador ni a servidores de terceros.',
    dataHeading: 'Datos utilizados',
    data: [
      'Títulos, URL, estructura de carpetas, fechas de creación y última apertura facilitadas por Chrome: para explorar, buscar y ordenar marcadores.',
      'ID y orden de los marcadores favoritos elegidos: para mostrarlos.',
      'Idioma, tema, categorías de fondo, colas de selección aleatoria, orden, visibilidad de botones y tiempo hasta ocultarlos: para guardar preferencias.',
      'Caché favicon existente de Chrome: para los iconos de los marcadores mostrados.',
    ],
    excluded:
      'La extensión no lee el contenido de páginas, contraseñas, cookies ni el historial completo, ni registra qué marcadores abres. No hay cuentas, anuncios, analítica ni rastreadores.',
    permissionsHeading: 'Permisos',
    permissions: [
      'Leer marcadores de Chrome y detectar cambios, sin crearlos, modificarlos ni eliminarlos.',
      'Guardar favoritos y preferencias en el perfil actual.',
      'Leer la caché local de iconos de Chrome, sin rastrear sitios de forma masiva ni usar servicios de iconos de terceros.',
    ],
    storageHeading: 'Almacenamiento, uso compartido y conservación',
    storage: [
      'Los favoritos y preferencias permanecen en el almacenamiento local de la extensión del perfil actual. La extensión no los sincroniza entre dispositivos. Chrome gestiona sus marcadores originales y su propia sincronización.',
      'El desarrollador no recibe, vende, comparte ni utiliza estos datos locales para publicidad. Permanecen hasta que cambies ajustes, quites favoritos, borres datos o desinstales la extensión. Desinstalar elimina los datos de la extensión, pero no los marcadores de Chrome.',
    ],
    externalHeading: 'Sitios web y soporte',
    external: [
      'Al hacer clic en un marcador o enlace de fuente del fondo se abre el sitio elegido, sujeto a su propia política. Shader Tab no adjunta tu lista de favoritos ni otros marcadores.',
      'Si envías un correo a soporte, recibimos la dirección, el mensaje y los adjuntos que facilites solo para atender tu solicitud, no para publicidad. No envíes contraseñas ni información sensible. Puedes solicitar en la misma dirección que eliminemos los datos personales de tus mensajes, salvo obligación legal de conservación. Un proveedor de correo procesa los mensajes.',
    ],
    choicesHeading: 'Tus opciones',
    choices:
      'Puedes quitar favoritos, cambiar preferencias u ocultar botones en Ajustes, o desactivar y desinstalar Shader Tab en Chrome. Ocultar botones no borra los favoritos ni las preferencias guardados.',
    updatesHeading: 'Actualizaciones',
    updates:
      'Las actualizaciones cambian la fecha de vigencia. Los cambios sustanciales en el tratamiento se explicarán antes de activar la función, recabando el consentimiento cuando sea necesario.',
    contactHeading: 'Contacto',
    contact: 'Desarrollador de Shader Tab:',
    compliance:
      'El uso y la transferencia de información recibida de las API de Google siguen la Política de Datos de Usuarios de Chrome Web Store, incluidos los requisitos de Limited Use.',
    licenseIntro:
      'Gracias a los autores y colaboradores de estos proyectos. Sus licencias completas rigen los derechos de autor y las condiciones de uso.',
    dependencies: 'Dependencias de la aplicación',
    notices: 'Derechos de autor y licencias completas de las dependencias incluidas',
    versions: 'Lista de versiones',
    inventory:
      'La lista se genera a partir de los módulos incluidos en la compilación, como React, Base UI, dnd-kit, Hugeicons, Three.js y otras dependencias de ejecución.',
    embedded: 'Licencias adicionales de dependencias integradas',
    embeddedNote:
      'Herramientas URL y three-stdlib integrados en Shader Gradient, y React reconciler integrado en Fiber. camera-controls y GLSL noise figuran abajo.',
    backgrounds: 'Fondos y fuentes',
    adaptations:
      'Las adaptaciones locales de ThreeUI abarcan el ciclo de renderizado, límites de fotogramas y resolución, interacción del puntero y textos decorativos.',
  },
};
