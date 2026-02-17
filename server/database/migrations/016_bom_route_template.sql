ALTER TABLE bom_items ADD COLUMN route_template_id INTEGER REFERENCES route_templates(id) ON DELETE SET NULL;
