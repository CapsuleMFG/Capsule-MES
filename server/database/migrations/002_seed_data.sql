-- Seed data for Capsule ERP

-- Insert workflow stages (4-stage workflow)
INSERT INTO workflow_stages (name, display_order, color) VALUES
    ('Engineering', 1, '#3b82f6'),
    ('WO Release', 2, '#8b5cf6'),
    ('Materials', 3, '#f59e0b'),
    ('Production', 4, '#10b981');

-- Insert sample clients
INSERT INTO clients (name, contact_name, email, phone, address) VALUES
    ('Lennar Homes', 'John Smith', 'john.smith@lennarhomes.com', '555-0101', '123 Builder Ave, Austin, TX'),
    ('DR Horton', 'Sarah Johnson', 'sarah.j@drhorton.com', '555-0102', '456 Construction Blvd, Phoenix, AZ'),
    ('Pulte Homes', 'Mike Williams', 'mike.w@pultehomes.com', '555-0103', '789 Developer St, Denver, CO'),
    ('KB Home', 'Emily Davis', 'emily.d@kbhome.com', '555-0104', '321 Housing Rd, Las Vegas, NV'),
    ('Taylor Morrison', 'David Brown', 'david.b@taylormorrison.com', '555-0105', '654 Residential Ln, Sacramento, CA');

-- Insert sample jobs
INSERT INTO jobs (job_number, client_id, priority, status, description, target_date, start_date, estimated_hours) VALUES
    ('CAP-2025-001', 1, 'Critical', 'Active', 'Bathroom Pods - Phase 1 (50 units)', '2025-03-15', '2025-02-01', 200),
    ('CAP-2025-002', 1, 'High', 'Active', 'Bathroom Pods - Phase 2 (75 units)', '2025-03-21', '2025-02-05', 280),
    ('CAP-2025-003', 2, 'Medium', 'Active', 'Kitchen Cabinets - Custom Series', '2025-04-10', '2025-02-03', 150),
    ('CAP-2025-004', 3, 'High', 'Active', 'Utility Room Assemblies (30 units)', '2025-03-25', '2025-02-02', 180),
    ('CAP-2025-005', 4, 'Low', 'Active', 'Laundry Room Modules (20 units)', '2025-04-15', '2025-02-04', 120);

-- Initialize workflow progress for all jobs (all stages start as "Not Started")
INSERT INTO job_workflow_progress (job_id, stage_id, status)
SELECT j.id, ws.id, 'Not Started'
FROM jobs j
CROSS JOIN workflow_stages ws;

-- Update some workflow stages to show progress on active jobs
-- Job CAP-2025-001: Engineering Completed, WO Release In Progress
UPDATE job_workflow_progress
SET status = 'Completed', started_at = '2025-02-01 08:00:00', completed_at = '2025-02-03 17:00:00', assignee = 'Alice Chen'
WHERE job_id = 1 AND stage_id = 1;

UPDATE job_workflow_progress
SET status = 'In Progress', started_at = '2025-02-04 08:00:00', assignee = 'Bob Martinez'
WHERE job_id = 1 AND stage_id = 2;

-- Job CAP-2025-002: Engineering In Progress
UPDATE job_workflow_progress
SET status = 'In Progress', started_at = '2025-02-05 09:00:00', assignee = 'Alice Chen'
WHERE job_id = 2 AND stage_id = 1;

-- Job CAP-2025-003: Engineering Completed, WO Release Completed, Materials In Progress
UPDATE job_workflow_progress
SET status = 'Completed', started_at = '2025-02-03 08:00:00', completed_at = '2025-02-04 16:00:00', assignee = 'Charlie Lee'
WHERE job_id = 3 AND stage_id = 1;

UPDATE job_workflow_progress
SET status = 'Completed', started_at = '2025-02-04 17:00:00', completed_at = '2025-02-05 11:00:00', assignee = 'Bob Martinez'
WHERE job_id = 3 AND stage_id = 2;

UPDATE job_workflow_progress
SET status = 'In Progress', started_at = '2025-02-05 12:00:00', assignee = 'Dana White'
WHERE job_id = 3 AND stage_id = 3;

-- Job CAP-2025-004: All stages completed except Production (Blocked)
UPDATE job_workflow_progress
SET status = 'Completed', started_at = '2025-02-02 08:00:00', completed_at = '2025-02-03 15:00:00', assignee = 'Alice Chen'
WHERE job_id = 4 AND stage_id = 1;

UPDATE job_workflow_progress
SET status = 'Completed', started_at = '2025-02-03 16:00:00', completed_at = '2025-02-04 10:00:00', assignee = 'Bob Martinez'
WHERE job_id = 4 AND stage_id = 2;

UPDATE job_workflow_progress
SET status = 'Completed', started_at = '2025-02-04 11:00:00', completed_at = '2025-02-05 09:00:00', assignee = 'Dana White'
WHERE job_id = 4 AND stage_id = 3;

UPDATE job_workflow_progress
SET status = 'Blocked', started_at = '2025-02-05 10:00:00', assignee = 'Frank Garcia', notes = 'Waiting for custom tooling delivery'
WHERE job_id = 4 AND stage_id = 4;

-- Insert sample materials
INSERT INTO job_materials (job_id, material_name, quantity, unit, status, cost, supplier) VALUES
    (1, 'Fiberglass Panels 4x8', 100, 'sheets', 'Received', 45.50, 'BuildPro Supply'),
    (1, 'PVC Piping 2-inch', 500, 'feet', 'Received', 2.75, 'PlumbCo'),
    (1, 'Shower Fixtures - Chrome', 50, 'sets', 'Ordered', 125.00, 'Fixture Warehouse'),
    (2, 'Fiberglass Panels 4x8', 150, 'sheets', 'Needed', 45.50, 'BuildPro Supply'),
    (2, 'Shower Fixtures - Brushed Nickel', 75, 'sets', 'Needed', 135.00, 'Fixture Warehouse'),
    (3, 'Plywood 3/4-inch', 80, 'sheets', 'Received', 52.00, 'Lumber Depot'),
    (3, 'Cabinet Hardware Kit', 30, 'sets', 'Ordered', 28.50, 'Hardware Plus'),
    (4, 'Steel Framing 16ga', 200, 'feet', 'Received', 8.25, 'Metal Supply Co'),
    (5, 'Countertop Laminate', 40, 'sheets', 'Needed', 65.00, 'Surface Solutions');

-- Insert sample labor entries
INSERT INTO job_labor (job_id, stage_id, employee_name, hours, date, notes) VALUES
    (1, 1, 'Alice Chen', 16, '2025-02-01', 'Engineering drawings and specifications'),
    (1, 1, 'Tom Anderson', 8, '2025-02-02', 'CAD modeling'),
    (1, 2, 'Bob Martinez', 6, '2025-02-04', 'Work order creation and review'),
    (3, 1, 'Charlie Lee', 12, '2025-02-03', 'Custom cabinet design'),
    (3, 2, 'Bob Martinez', 4, '2025-02-04', 'Work order processing'),
    (3, 3, 'Dana White', 8, '2025-02-05', 'Material procurement and coordination'),
    (4, 1, 'Alice Chen', 14, '2025-02-02', 'Utility room assembly engineering'),
    (4, 2, 'Bob Martinez', 5, '2025-02-03', 'WO documentation'),
    (4, 3, 'Dana White', 7, '2025-02-04', 'Material ordering and receiving');

-- Update actual hours for jobs based on labor entries
UPDATE jobs SET actual_hours = (
    SELECT COALESCE(SUM(hours), 0)
    FROM job_labor
    WHERE job_labor.job_id = jobs.id
);
