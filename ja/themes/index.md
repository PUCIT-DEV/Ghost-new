---
lang: ja
layout: themes
meta_title: Ghostのテーマを作成するには - Ghost日本語ガイド
meta_description: Ghostのテーマを作成する手順です。
heading: Ghostのテーマの作成方法
subheading: あなたオリジナルのテーマを作成するための手順です。
chapter: themes
---

{% raw %}

## テーマの変更 <a id="switching-theme"></a>

Ghostのテーマは<code class="path">content/themes/</code>に配置されています。

デフォルトのCasperテーマ以外を使用したければ、公式の[マーケットプレイス・ギャラリー](http://marketplace.ghost.org/)をご覧ください。お好きなテーマファイルをダウンロードして展開し、Casperディレクトリと同じように<code class="path">content/themes</code>に配置してください。

独自のテーマを作りたければ、Casperディレクトリをコピペして編集してみることを推奨します。

新しく追加されたテーマに変更するには、

1.  Ghostを再起動する。今のところ、<code class="path">content/themes</code>に追加されたフォルダーは自動では検知されませんので、再起動が必要です。
2.  Ghostの管理画面にログインし、<code class="path">/ghost/settings/general/</code>にアクセスする。
3.  テーマ名を'Theme'ドロップダウンから選択します。
4.  'Save'をクリックします。
5.  ブログにアクセスして、テーマが変更されていることを確かめます。


##  Handlebarsとは? <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/)とは、Ghostが利用しているテンプレート言語です。

> Handlebarsは、セマンティックなテンプレートを簡単に作成する機能を提供します。

もし独自のテーマを作成したければ、まずはHandlebarsのシンタックスに慣れたほうが良いでしょう。[Handlebarsのドキュメンテーション](http://handlebarsjs.com/expressions.html)、または[Treehouseのチュートリアル](http://blog.teamtreehouse.com/getting-started-with-handlebars-js)がおすすめです。チュートリアルをやる場合、Handlebarsのインストールと使い方の部分は読む必要はありません(Ghostに既にインストールされているからです)ので、'Basic Expressions'から始めてみてください。

## Ghostのテーマについて <a id="about"></a>

Ghostのテーマ作成・保守はシンプルにできるように設計されています。たとえば、テンプレート(HTML)とビジネスロジック(JavaScript)はハッキリと分離されています。Handlebarsは(ほぼ)ロジックが無く、関心の分離を規則としていますので、コンテンツを表示するためのビジネスロジックを独立させることができます。こうすることで、デザイナーと開発者が共同でテーマを作ることが容易になります。

Handlebarsのテンプレートは階層制(テンプレートがテンプレートを継承できる)になっており、部分テンプレートもサポートしています。Ghostはこれらを活用し、コードの重複を防ぎ、それぞれのテンプレートに単一責任の原則を適用しています。構成がしっかりしているテーマは保守も容易ですし、上手く分離されたすればコンポーネントはテーマ間で再利用がしやすくなります。

みなさんに「Ghostのテーマは扱いやすい」と思って頂けると嬉しいです。

## Ghostテーマのファイル構造 <a id="file-structure"></a>

次のようなファイル構造を推奨します。

```
.
├── /assets
|   └── /css
|       ├── screen.css
|   ├── /fonts
|   ├── /images
|   ├── /js
├── default.hbs
├── index.hbs [required]
└── post.hbs [required]
```

現在のところ、default.hbsや他のフォルダーは無くても構いません。<code class="path">index.hbs</code>と<code class="path">post.hbs</code>は必ず必要で、無いとGhostが動きません。<code class="path">partials</code>は特殊なディレクトリで、部分テンプレートを使いたければここに配置してください。たとえば、<code class="path">list-post.hbs</code>が連続する記事のうちのひとつを表示するのであれば、ホームページに使えますし、いずれアーカイブページやタグページにも使えるでしょう。<code class="path">partials</code>は、あらかじめGhostに組み込まれているテンプレートを上書きするテンプレート(ページ分割など)の配置場所でもあります。<code class="path">pagination.hbs</code>ファイルを<code class="path">partials</code>に入れれば、独自のページ分割用のHTMLを使うことができます。

### default.hbs

ベースとなるテンプレートで、全てのページに表示しないといけないHTMLが含まれています。`<html>`、 `<head>`、`<body>`タグや、`{{ghost_head}}`や`{{ghost_foot}}`ヘルパー、そしてサイト全体で使われるヘッダーやフッターが含まれます。

default.hbsには`{{{body}}}`というHandlebarsのコードが含まれており、default.hbsを継承するテンプレートの内容が挿入される位置を示しています。テンプレートの最初の行に`{{!< default}}`と書けば、このテンプレートはdefault.hbsを継承することになり、ファイルの内容が`{{{body}}}`で指定された位置に挿入されます。

### index.hbs

これはホームページ用のテンプレートで、<code class="path">default.hbs</code>を継承します。ホームページに表示される記事のリストが渡されますので、<code class="path">index.hbs</code>はそれぞれの記事がどのように表示されるべきかを決めます。

Casper(現段階のデフォルトテーマ)では、ホームページには大きなヘッダーがあり、`@blog`のグローバル設定を利用してブログのロゴ、タイトル、説明を表示します。それに続いて、`{{#foreach}}`ヘルパーを利用して最新の記事が順番に表示されます。

### post.hbs

こちらは個別の記事を表示するためのテンプレートで、同じく<code class="path">default.hbs</code>を継承します。

Casper(現段階のデフォルトテーマ)では、個別の記事にはそれぞれヘッダーがあり、こちらも`@blog`のグローバル設定と`{{#post}}`データアクセサを利用して記事の詳細をすべて表示します。

### Post styling & previewing

Ghostのテーマを作成する際は、記事のCSSとその他のCSSが競合しないよう、クラスとIDのスコープに注意してください。記事の中でどんなクラスやID(見出し用に自動生成される)が使われるか分からないからです。なので、ページの違う部分を違うスコープにするべきです。#my-idは競合する可能性が高いですが、#themename-my-idは低いです。

Ghostの二画面エディタでは、実際の記事ページに近い、記事のプレビューが表示されます。しかし、プレビューを実際の記事ページと一致させるには、プレビュー用のCSSがテーマの一部として必要です。この機能はまだ実装されていませんが、実装された時に楽になるよう、記事用のCSSファイル(例:post.css)をテーマの他のCSS(例:style.css)と分けておくことを推奨します。

## Creating Your Own Theme <a id="create-your-own"></a>

Create your own Ghost theme by either copying Casper, or adding a new folder to the <code class="path">content/themes</code> directory with the name of your theme, E.g. my-theme (names should be lowercase, and contain letters, numbers and hyphens only). Then add two empty files to your new theme folder: index.hbs and post.hbs. It won't display anything, but this is effectively a valid theme.

### The post list

<code class="path">index.hbs</code> gets handed an object called `posts` which can be used with the foreach helper to output each post. E.g.

```
{{#foreach posts}}
// here we are in the context of a single post
// whatever you put here gets run for each post in posts
{{/foreach}}
```

See the section on the [`{{#foreach}}`](#foreach-helper) helper for more details.

#### Pagination

See the section on the [`{{pagination}}`](#pagination-helper) helper.

### Outputting individual posts

Once you are in the context of a single post, either by looping through the posts list with `foreach` or inside of <code class="path">post.hbs</code> you have access to the properties of a post.

For the time being, these are:

*   id – *post id*
*   title – *post title*
*   url – *the relative URL for a post*
*   content – *post HTML*
*   published_at – *date the post was published*
*   author – *full details of the post author* (see below for more details)

Each of these properties can be output using the standard handlebars expression, e.g. `{{title}}`.

<div class="note">
  <p>
    <strong>Notes:</strong> <ul>
      <li>
        the content property is overridden and output by the <code>{{content}}</code> helper which ensures the HTML is output safely & correctly. See the section on the <a href="#content-helper"><code>{{content}}</code> helper</a> for more info.
      </li>
      <li>
        the url property provided by the <code>{{url}}</code> helper. See the section on the <a href="#url-helper"><code>{{url}}</code> helper</a> for more info.
      </li>
    </ul>
  </p>
</div>

#### Post author

When inside the context of a single post, the following author data is available:

*   `{{author.name}}` – the name of the author
*   `{{author.email}}` – the author's email address
*   `{{author.bio}}` – the author's bio
*   `{{author.website}}` – the author's website
*   `{{author.image}}` – the author's profile image
*   `{{author.cover}}` – the author's cover image

You can use just`{{author}}` to output the author's name.

This can also be done by using a block expression:

```
{{#author}}
    <a href="mailto:{{email}}">Email {{name}}</a>
{{/author}}
```

#### Post Tags

When inside the context of a single post, the following tag data is available

*   `{{tag.name}}` – the name of the tag

You can use `{{tags}}` to output a comma separated list of tags, or if you prefer, specify your own separator `{{tags separator=""}}`

This can also be done by using a block expression:

```
<ul>
    {{#tags}}
        <li>{{name}}</li>
    {{/tags}}
</ul>
```

### Global Settings

Ghost themes have access to a number of global settings via the `@blog` global data accessor.

*   `{{@blog.url}}` – the url specified for this env in <code class="path">config.js</code>
*   `{{@blog.title}}` – the blog title from the settings page
*   `{{@blog.description}}` – the blog description from the settings page
*   `{{@blog.logo}}` – the blog logo from the settings page

## Built-in Helpers <a id="helpers"></a>

Ghost has a number of built in helpers which give you the tools you need to build your theme. Helpers are classified into two types: block and output helpers.

**[Block Helpers](http://handlebarsjs.com/block_helpers.html)** have a start and end tag E.g. `{{#foreach}}{{/foreach}}`. The context between the tags changes and these helpers may also provide you with additional properties which you can access with the `@` symbol.

**Output Helpers** look much the same as the expressions used for outputting data e.g. `{{content}}`. They perform useful operations on the data before outputting it, and often provide you with options for how to format the data. Some output helpers use templates to format the data with HTML a bit like partials. Some output helpers are also block helpers, providing a variation of their functionality.

### <code>foreach</code> <a id="foreach-helper"></a>

*   Helper type: block
*   Options: `columns` (number)

`{{#foreach}}` is a special loop helper designed for working with lists of posts. By default the each helper in handlebars adds the private properties `@index` for arrays and `@key` for objects, which can be used inside the each loop.

`foreach` extends this and adds the additional private properties of `@first`, `@last`, `@even`, `@odd`, `@rowStart` and `@rowEnd` to both arrays and objects. This can be used to produce more complex layouts for post lists and other content. For examples see below:

#### `@first` & `@last`

The following example checks through an array or object e.g `posts` and tests for the first entry.

```
{{#foreach posts}}
    {{#if @first}}
        <div>First post</div>
    {{/if}}
{{/foreach}}
```

We can also nest `if` statements to check multiple properties. In this example we are able to output the first and last post separately to other posts.

```
{{#foreach posts}}
    {{#if @first}}
    <div>First post</div>
    {{else}}
        {{#if @last}}
            <div>Last post</div>
        {{else}}
            <div>All other posts</div>
        {{/if}}
    {{/if}}
{{/foreach}}
```

#### `@even` & `@odd`

The following example adds a class of even or odd, which could be used for zebra striping content:

```
{{#foreach posts}}
        <div class="{{#if @even}}even{{else}}odd{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` & `@rowEnd`

The following example shows you how to pass in a column argument so that you can set properties for the first and last element in a row. This allows for outputting content in a grid layout.

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}first{{/if}}{{#if @rowEnd}}last{{/if}}">{{title}}</li>
{{/foreach}}
```

### <code>content</code> <a id="content-helper"></a>

*   Helper type: output
*   Options: `words` (number), `characters` (number) [defaults to show all]

`{{content}}` is a very simple helper used for outputting post content. It makes sure that your HTML gets output correctly.

You can limit the amount of HTML content to output by passing one of the options:

`{{content words="100"}}` will output just 100 words of HTML with correctly matched tags.

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   Helper type: output
*   Options: `words` (number), `characters` (number) [defaults to 50 words]

`{{excerpt}}` outputs content but strips all HTML. This is useful for creating excerpts of posts.

You can limit the amount of text to output by passing one of the options:

`{{excerpt characters="140"}}` will output 140 characters of text.

### <code>date</code> <a id="date-helper"></a>

*   Helper type: output
*   Options: `format` (date format, default “MMM Do, YYYY”), `timeago` (boolean)

`{{date}}` is a formatting helper for outputting dates in various format. You can either pass it a date and a format string to be used to output the date like so:

```
// outputs something like 'July 11, 2013'
{{date published_at format="MMMM DD, YYYY"}}
```

Or you can pass it a date and the timeago flag:

```
// outputs something like '5 mins ago'
{{date published_at timeago="true"}}
```

If you call `{{date}}` without a format, it will default to “MMM Do, YYYY”.

If you call `{{date}}` in the context of a post without telling it which date to display, it will default to `published_at`.

If you call `{{date}}` outside the context of a post without telling it which date to display, it will default to the current date.

`date` uses [moment.js](http://momentjs.com/) for formatting dates. See their [documentation](http://momentjs.com/docs/#/parsing/string-format/) for a full explanation of all the different format strings that can be used.

### <code>url</code> <a id="url-helper"></a>

*   Helper type: output
*   Options: `absolute`

`{{url}}` outputs the relative url for a post when inside the post context. Outside of the post context it will output nothing

You can force the url helper to output an absolute url by using the absolute option, E.g. `{{url absolute="true"}}`

###  <code>pagination</code> <a href="pagination-helper"></a>

*   Helper type: output, template-driven
*   Options: none (coming soon)

`{{pagination}}` is a template driven helper which outputs HTML for 'newer posts' and 'older posts' links if they are available and also says which page you are on.

You can override the HTML output by the pagination helper by placing a file called <code class="path">pagination.hbs</code> inside of <code class="path">content/themes/your-theme/partials</code>.

### <code>body_class</code> <a id="bodyclass-helper"></a>

*   Helper type: output
*   Options: none

`{{body_class}}` – outputs classes intended for the `<body>` tag in <code class="path">default.hbs</code>, useful for targeting specific pages with styles.

### <code>post_class</code> <a id="postclass-helper"></a>

*   Helper type: output
*   Options: none

`{{post_class}}` – outputs classes intended your post container, useful for targeting posts with styles.

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   Helper type: output
*   Options: none

`{{ghost_head}}` – belongs just before the `</head>` tag in <code class="path">default.hbs</code>, used for outputting meta tags, scripts and styles. Will be hookable.

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   Helper type: output
*   Options: none

`{{ghost_foot}}` – belongs just before the `</body>` tag in <code class="path">default.hbs</code>, used for outputting scripts. Outputs jquery by default. Will be hookable.

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   Helper type: output
*   Options: none

`{{meta_title}}` – outputs the post title on posts, or otherwise the blog title. Used for outputting title tags in the `</head>` block. E.g. `<title>{{meta_title}}</title>`. Will be hookable.

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   Helper type: output
*   Options: none

`{{meta_description}}` - outputs nothing (yet) on posts, outputs the blog description on all other pages. Used for outputing the description meta tag. E.g. `<meta name="description" content="{{meta_description}}" />`. Will be hookable.

## テーマのトラブルシューティング <a id="troubleshooting"></a>

#### 1. エラー: Failed to lookup view "index" or "post"

テーマフォルダー内には必ずindex.hbsとpost.hbsが必要です。名前のミスに注意してください。

{% endraw %}