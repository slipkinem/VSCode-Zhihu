"use strict";

import * as vscode from "vscode";
import { FileExplorer } from "./fileExplorer";
import { FtpExplorer } from "./ftpExplorer";
import { JsonOutlineProvider } from "./jsonOutline";
import { AccountService } from "./service/account.service";
import { AuthenticateService } from "./service/authenticate.service";
import { HttpService } from "./service/http.service";
import { ProfileService } from "./service/profile.service";
import { SearchService } from "./service/search.service";
import { WebviewService } from "./service/webview.service";
import { FeedTreeViewProvider, ZhihuTreeItem } from "./treeview/feed-treeview-provider";
import { HotStoryTreeViewProvider } from "./treeview/hotstory-treeview-provider";
import { CookieJar } from "tough-cookie";
import * as FileCookieStore from "tough-cookie-filestore";
import * as path from "path";
import * as fs from "fs";
import { PublishService } from "./service/publish.service";
import MarkdownIt = require("markdown-it");
import { CollectionService } from "./service/collection.service";

export async function activate(context: vscode.ExtensionContext) {
	if(!fs.existsSync(path.join(context.extensionPath, './cookie.json'))) {
		fs.createWriteStream(path.join(context.extensionPath, './cookie.json')).end()
	}

	// Bean Initialization
	const store = new FileCookieStore(path.join(context.extensionPath, './cookie.json'));
	const mdParser = new MarkdownIt();
	const cookieJar = new CookieJar(store);
	const httpService = new HttpService(context, cookieJar, store);
	const profileService = new ProfileService(context, httpService);
	await profileService.fetchProfile();
	const accountService = new AccountService(context, httpService);
	const collectionService = new CollectionService(context, httpService);
	const webviewService = new WebviewService(context, httpService);
	const publishService = new PublishService(context, httpService, mdParser, webviewService);
	const searchService = new SearchService(context, webviewService);
	const feedTreeViewProvider = new FeedTreeViewProvider(context, accountService, profileService, httpService);
	const hotStoryTreeViewProvider = new HotStoryTreeViewProvider();
	const authenticateService = new AuthenticateService(context, profileService, accountService, feedTreeViewProvider, httpService, webviewService);

	context.subscriptions.push(
		vscode.commands.registerCommand("zhihu.openWebView", async (object) => {
			await webviewService.openWebview(object);
		}
		));
	vscode.commands.registerCommand("zhihu.search", async () => 
		await searchService.getSearchItems()
	);
	vscode.commands.registerCommand("zhihu.login", () => 
		authenticateService.login()
	);
	vscode.commands.registerCommand("zhihu.logout", () => 
		authenticateService.logout()
	);
	vscode.window.registerTreeDataProvider(
		"zhihu-feed",
		feedTreeViewProvider
	);
	vscode.window.registerTreeDataProvider(
		"zhihu-hotStories",
		hotStoryTreeViewProvider
	);
	vscode.commands.registerTextEditorCommand('zhihu.publish', (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
		publishService.publish(textEditor, edit);
	})
	vscode.commands.registerTextEditorCommand('zhihu.preview', (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
		publishService.preview(textEditor, edit);
	})
	vscode.commands.registerCommand("zhihu.refreshEntry", () => {
		feedTreeViewProvider.refresh();
		hotStoryTreeViewProvider.refresh();
	}
	);
	vscode.commands.registerCommand("extension.openPackageOnNpm", moduleName =>
		vscode.commands.executeCommand(
			"vscode.open",
			vscode.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)
		)
	);
	vscode.commands.registerCommand("zhihu.addEntry", () =>
		vscode.window.showInformationMessage(`Successfully called add entry.`)
	);
	vscode.commands.registerCommand(
		"zhihu.editEntry",
		(node: ZhihuTreeItem) =>
			vscode.window.showInformationMessage(
				`Successfully called edit entry on ${node.label}.`
			)
	);
	vscode.commands.registerCommand(
		"zhihu.nextPage",
		(node: ZhihuTreeItem) => {
			node.page++;
			feedTreeViewProvider.refresh(node);
		}
	)
	vscode.commands.registerCommand(
		"zhihu.previousPage",
		(node: ZhihuTreeItem) => {
			node.page--;
			feedTreeViewProvider.refresh(node);
		}
	)
	vscode.commands.registerCommand(
		"zhihu.deleteEntry",
		(node: ZhihuTreeItem) =>
			vscode.window.showInformationMessage(
				`Successfully called delete entry on ${node.label}.`
			)
	);

	const jsonOutlineProvider = new JsonOutlineProvider(context);
	vscode.window.registerTreeDataProvider("jsonOutline", jsonOutlineProvider);
	vscode.commands.registerCommand("jsonOutline.refresh", () =>
		jsonOutlineProvider.refresh()
	);
	vscode.commands.registerCommand("jsonOutline.refreshNode", offset =>
		jsonOutlineProvider.refresh(offset)
	);
	vscode.commands.registerCommand("jsonOutline.renameNode", offset =>
		jsonOutlineProvider.rename(offset)
	);
	vscode.commands.registerCommand("extension.openJsonSelection", range =>
		jsonOutlineProvider.select(range)
	);

	// Samples of `window.createView`
	new FtpExplorer(context);
	new FileExplorer(context);

	// Test View
}