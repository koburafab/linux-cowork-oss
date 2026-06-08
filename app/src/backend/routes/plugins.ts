/**
 * Plugin routes — list and toggle plugins/skills
 */

import { Hono } from "hono";
import { loadSkills } from "../../core/skills/loader";
import { loadMcpConfig } from "../mcp-bridge";
import { createDefaultRegistry } from "../tool-registry";

export interface Plugin {
	id: string;
	name: string;
	description: string;
	type: "builtin" | "skill" | "mcp";
	enabled: boolean;
	tools?: string[];
}

/** Track disabled skill IDs in memory (for toggle) */
const disabledSkills = new Set<string>();

export function createPluginRoutes(): Hono {
	const app = new Hono();

	app.get("/plugins", (c) => {
		try {
			const plugins: Plugin[] = [];

			// 1. Built-in tools from registry
			const registry = createDefaultRegistry();
			const defs = registry.getDefinitions();
			for (const def of defs) {
				plugins.push({
					id: `builtin:${def.name}`,
					name: def.name,
					description: def.description,
					type: "builtin",
					enabled: true,
					tools: [def.name],
				});
			}

			// 2. Skills from ~/.config/linux-cowork/skills/
			const skills = loadSkills();
			for (const skill of skills) {
				const id = `skill:${skill.name}`;
				plugins.push({
					id,
					name: skill.name,
					description: skill.description,
					type: "skill",
					enabled: !disabledSkills.has(id),
					tools: skill.tools,
				});
			}

			// 3. MCP servers from ~/.config/linux-cowork/mcp-servers.json
			const mcpConfig = loadMcpConfig();
			for (const server of mcpConfig.servers) {
				const id = `mcp:${server.name}`;
				plugins.push({
					id,
					name: server.name,
					description:
						`Serveur MCP — ${server.command} ${server.args.join(" ")}`.trim(),
					type: "mcp",
					enabled: !disabledSkills.has(id),
				});
			}

			return c.json({ plugins });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			return c.json({ error: msg }, 500);
		}
	});

	app.post("/plugins/:id/toggle", async (c) => {
		try {
			const id = decodeURIComponent(c.req.param("id"));

			// Built-in plugins cannot be toggled
			if (id.startsWith("builtin:")) {
				return c.json({ error: "Built-in plugins cannot be disabled" }, 400);
			}

			if (disabledSkills.has(id)) {
				disabledSkills.delete(id);
			} else {
				disabledSkills.add(id);
			}

			const enabled = !disabledSkills.has(id);
			return c.json({ id, enabled });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			return c.json({ error: msg }, 500);
		}
	});

	return app;
}
