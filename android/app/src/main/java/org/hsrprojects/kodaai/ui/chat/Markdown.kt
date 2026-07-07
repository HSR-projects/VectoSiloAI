package org.hsrprojects.kodaai.ui.chat

import android.annotation.SuppressLint
import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.ClickableText
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import org.hsrprojects.kodaai.ui.theme.KodaAccentSoft
import org.hsrprojects.kodaai.ui.theme.KodaBorder
import org.hsrprojects.kodaai.ui.theme.KodaMuted
import org.hsrprojects.kodaai.ui.theme.KodaSurface2

/**
 * A compact, dependency-free Markdown renderer for chat answers. Handles the
 * subset models emit: headings, fenced code blocks (with copy), bullet/numbered
 * lists, blockquotes, GFM tables, and inline bold/italic/code/tappable links.
 */
@Composable
fun MarkdownText(text: String, color: Color, modifier: Modifier = Modifier) {
    val blocks = remember(text) { parseBlocks(preprocessArtifacts(text)) }
    Column(modifier) {
        blocks.forEach { block ->
            when (block) {
                is MdBlock.Heading -> InlineText(
                    annotateInline(block.text),
                    color = color,
                    fontSize = headingSize(block.level),
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp, bottom = 2.dp),
                )
                is MdBlock.Paragraph -> InlineText(
                    annotateInline(block.text),
                    color = color,
                    fontSize = 15.sp,
                    modifier = Modifier.padding(vertical = 3.dp),
                )
                is MdBlock.Bullet -> Row(Modifier.padding(vertical = 2.dp)) {
                    Text("•  ", color = KodaAccentSoft, fontSize = 15.sp)
                    InlineText(annotateInline(block.text), color = color, fontSize = 15.sp)
                }
                is MdBlock.Numbered -> Row(Modifier.padding(vertical = 2.dp)) {
                    Text("${block.number}. ", color = KodaAccentSoft, fontSize = 15.sp)
                    InlineText(annotateInline(block.text), color = color, fontSize = 15.sp)
                }
                is MdBlock.Quote -> Row(
                    Modifier
                        .padding(vertical = 4.dp)
                        .fillMaxWidth()
                        .background(KodaSurface2, RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                ) {
                    InlineText(annotateInline(block.text), color = KodaMuted, fontSize = 15.sp)
                }
                is MdBlock.Code -> CodeBlock(block, color)
                is MdBlock.Table -> TableBlock(block, color)
            }
        }
    }
}

@Composable
private fun InlineText(
    text: AnnotatedString,
    color: Color,
    fontSize: TextUnit,
    fontWeight: FontWeight? = null,
    modifier: Modifier = Modifier,
) {
    val uriHandler = LocalUriHandler.current
    ClickableText(
        text = text,
        modifier = modifier,
        style = TextStyle(color = color, fontSize = fontSize, fontWeight = fontWeight),
        onClick = { offset ->
            text.getStringAnnotations("URL", offset, offset).firstOrNull()?.let {
                runCatching { uriHandler.openUri(it.item) }
            }
        },
    )
}

@Composable
private fun CodeBlock(block: MdBlock.Code, color: Color) {
    val clipboard = LocalClipboardManager.current
    var showPreview by remember { mutableStateOf(false) }
    val isHtml = block.language.endsWith(".html", true) ||
        block.language.equals("html", true) ||
        block.code.trimStart().startsWith("<!doctype", true) ||
        block.code.contains("<html", true)

    Column(
        Modifier
            .padding(vertical = 6.dp)
            .fillMaxWidth()
            .background(KodaSurface2, RoundedCornerShape(10.dp)),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(start = 12.dp, end = 8.dp, top = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                block.language.ifBlank { "code" },
                color = KodaMuted,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
            )
            Row {
                if (isHtml) {
                    Text(
                        "Preview",
                        color = KodaAccentSoft,
                        fontSize = 12.sp,
                        modifier = Modifier
                            .clickable { showPreview = true }
                            .padding(4.dp),
                    )
                }
                Text(
                    "Copy",
                    color = KodaAccentSoft,
                    fontSize = 12.sp,
                    modifier = Modifier
                        .clickable { clipboard.setText(AnnotatedString(block.code)) }
                        .padding(4.dp),
                )
            }
        }
        Text(
            block.code,
            color = color,
            fontSize = 13.sp,
            fontFamily = FontFamily.Monospace,
            modifier = Modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 8.dp),
        )
    }

    if (showPreview) {
        HtmlPreviewDialog(html = block.code, onClose = { showPreview = false })
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun HtmlPreviewDialog(html: String, onClose: () -> Unit) {
    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .background(Color.White),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(KodaSurface2)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Preview", color = KodaAccentSoft, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    "Close",
                    color = KodaAccentSoft,
                    fontSize = 14.sp,
                    modifier = Modifier.clickable { onClose() },
                )
            }
            AndroidView(
                modifier = Modifier.fillMaxWidth().weight(1f),
                factory = { ctx ->
                    WebView(ctx).apply {
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                    }
                },
                update = { it.loadDataWithBaseURL(null, html, "text/html", "utf-8", null) },
            )
        }
    }
}

@Composable
private fun TableBlock(table: MdBlock.Table, color: Color) {
    val cols = table.headers.size.coerceAtLeast(1)
    Column(
        Modifier
            .padding(vertical = 6.dp)
            .fillMaxWidth()
            .border(1.dp, KodaBorder, RoundedCornerShape(8.dp)),
    ) {
        Row(Modifier.background(KodaSurface2)) {
            for (c in 0 until cols) {
                Text(
                    table.headers.getOrElse(c) { "" },
                    color = color,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f).padding(8.dp),
                )
            }
        }
        table.rows.forEach { row ->
            HorizontalDivider(color = KodaBorder)
            Row {
                for (c in 0 until cols) {
                    InlineText(
                        annotateInline(row.getOrElse(c) { "" }),
                        color = color,
                        fontSize = 13.sp,
                        modifier = Modifier.weight(1f).padding(8.dp),
                    )
                }
            }
        }
    }
}

private fun headingSize(level: Int) = when (level) {
    1 -> 22.sp
    2 -> 19.sp
    3 -> 17.sp
    else -> 16.sp
}

private val kodaFileRe = Regex(
    "<koda-file\\s+path=\"([^\"]*)\"\\s*>([\\s\\S]*?)</koda-file>",
    RegexOption.IGNORE_CASE,
)
private val kodaFileOpenRe = Regex(
    "<koda-file\\s+path=\"([^\"]*)\"\\s*>([\\s\\S]*)$",
    RegexOption.IGNORE_CASE,
)
private val directiveRe = Regex("\\[\\[[^\\]]*\\]\\]")

/**
 * Normalise the backend's artifact syntax into plain Markdown so it renders
 * natively: `<koda-file path="x">…</koda-file>` becomes a fenced code block
 * labelled with the filename, and `[[website:…]]` / `[[computer:…]]` /
 * `[[artifact:…]]` directives are stripped.
 */
private fun preprocessArtifacts(src: String): String {
    var out = kodaFileRe.replace(src) { m ->
        "\n```${m.groupValues[1].trim()}\n${m.groupValues[2].trim('\n')}\n```\n"
    }
    // A file block that's still streaming (no closing tag yet).
    out = kodaFileOpenRe.replace(out) { m ->
        "\n```${m.groupValues[1].trim()}\n${m.groupValues[2].trim('\n')}\n"
    }
    out = out.replace("</koda-file>", "")
    out = directiveRe.replace(out, "")
    return out.trim()
}

private sealed interface MdBlock {
    data class Heading(val level: Int, val text: String) : MdBlock
    data class Paragraph(val text: String) : MdBlock
    data class Bullet(val text: String) : MdBlock
    data class Numbered(val number: Int, val text: String) : MdBlock
    data class Quote(val text: String) : MdBlock
    data class Code(val language: String, val code: String) : MdBlock
    data class Table(val headers: List<String>, val rows: List<List<String>>) : MdBlock
}

private val headingRe = Regex("^(#{1,6})\\s+(.*)")
private val bulletRe = Regex("^\\s*[-*+]\\s+(.*)")
private val numberedRe = Regex("^\\s*(\\d+)[.)]\\s+(.*)")

private fun parseBlocks(src: String): List<MdBlock> {
    val blocks = mutableListOf<MdBlock>()
    val lines = src.replace("\r\n", "\n").split("\n")
    val paragraph = StringBuilder()

    fun flushParagraph() {
        if (paragraph.isNotBlank()) blocks += MdBlock.Paragraph(paragraph.toString().trim())
        paragraph.setLength(0)
    }

    var i = 0
    while (i < lines.size) {
        val line = lines[i]
        val trimmed = line.trimStart()
        when {
            trimmed.startsWith("```") -> {
                flushParagraph()
                val language = trimmed.removePrefix("```").trim()
                val code = StringBuilder()
                i++
                while (i < lines.size && !lines[i].trimStart().startsWith("```")) {
                    code.appendLine(lines[i]); i++
                }
                if (i < lines.size) i++ // consume closing fence
                blocks += MdBlock.Code(language, code.toString().trimEnd('\n'))
            }
            isTableStart(lines, i) -> {
                flushParagraph()
                val headers = splitTableRow(lines[i])
                i += 2 // header + separator
                val rows = mutableListOf<List<String>>()
                while (i < lines.size && lines[i].contains("|") && lines[i].isNotBlank()) {
                    rows += splitTableRow(lines[i]); i++
                }
                blocks += MdBlock.Table(headers, rows)
            }
            headingRe.matches(line) -> {
                flushParagraph()
                val m = headingRe.find(line)!!
                blocks += MdBlock.Heading(m.groupValues[1].length, m.groupValues[2].trim())
                i++
            }
            trimmed.startsWith(">") -> {
                flushParagraph()
                blocks += MdBlock.Quote(trimmed.removePrefix(">").trim())
                i++
            }
            bulletRe.matches(line) -> {
                flushParagraph()
                blocks += MdBlock.Bullet(bulletRe.find(line)!!.groupValues[1].trim())
                i++
            }
            numberedRe.matches(line) -> {
                flushParagraph()
                val m = numberedRe.find(line)!!
                blocks += MdBlock.Numbered(m.groupValues[1].toIntOrNull() ?: 1, m.groupValues[2].trim())
                i++
            }
            line.isBlank() -> { flushParagraph(); i++ }
            else -> {
                if (paragraph.isNotEmpty()) paragraph.append(' ')
                paragraph.append(line.trim())
                i++
            }
        }
    }
    flushParagraph()
    return blocks
}

private fun isTableStart(lines: List<String>, i: Int): Boolean {
    if (i + 1 >= lines.size) return false
    if (!lines[i].contains("|")) return false
    val sep = lines[i + 1].trim()
    return sep.contains("|") && sep.contains("-") &&
        sep.all { it == '|' || it == '-' || it == ':' || it == ' ' }
}

private fun splitTableRow(line: String): List<String> =
    line.trim().trim('|').split("|").map { it.trim() }

/** Inline formatting: **bold**, *italic* / _italic_, `code`, [text](url). */
private fun annotateInline(s: String): AnnotatedString = buildAnnotatedString {
    val bold = SpanStyle(fontWeight = FontWeight.Bold)
    val italic = SpanStyle(fontStyle = FontStyle.Italic)
    val code = SpanStyle(fontFamily = FontFamily.Monospace, color = KodaAccentSoft)
    val link = SpanStyle(color = KodaAccentSoft, textDecoration = TextDecoration.Underline)

    var i = 0
    while (i < s.length) {
        val c = s[i]
        when {
            c == '`' -> {
                val end = s.indexOf('`', i + 1)
                if (end > i) { withStyle(code) { append(s.substring(i + 1, end)) }; i = end + 1 }
                else { append(c); i++ }
            }
            c == '*' && i + 1 < s.length && s[i + 1] == '*' -> {
                val end = s.indexOf("**", i + 2)
                if (end > i) { withStyle(bold) { append(s.substring(i + 2, end)) }; i = end + 2 }
                else { append(c); i++ }
            }
            c == '*' || c == '_' -> {
                val end = s.indexOf(c, i + 1)
                if (end > i) { withStyle(italic) { append(s.substring(i + 1, end)) }; i = end + 1 }
                else { append(c); i++ }
            }
            c == '[' -> {
                val close = s.indexOf(']', i + 1)
                if (close > i && close + 1 < s.length && s[close + 1] == '(') {
                    val urlEnd = s.indexOf(')', close + 2)
                    if (urlEnd > close) {
                        val url = s.substring(close + 2, urlEnd)
                        pushStringAnnotation("URL", url)
                        withStyle(link) { append(s.substring(i + 1, close)) }
                        pop()
                        i = urlEnd + 1
                    } else { append(c); i++ }
                } else { append(c); i++ }
            }
            else -> { append(c); i++ }
        }
    }
}
