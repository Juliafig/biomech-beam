
INSERT INTO public.holidays (day,label) VALUES
 ('2026-10-03','German Unity Day'),('2026-12-24','Christmas Eve'),('2026-12-25','Christmas Day'),('2026-12-26','Boxing Day'),('2026-12-31','New Year Eve');

INSERT INTO public.projects (nr,opportunity_code,quote,project_code,customer_id,title,price,responsible_id,start_date,end_date,planned_days,machine_id,preferred_machine_id,status,priority,deadline)
SELECT v.nr,v.opp,v.quote,v.pcode,c.id,v.title,v.price,e.id,v.sd::date,v.ed::date,v.days,m.id,m.id,v.status,v.prio,v.deadline::date
FROM (VALUES
 (1,'HR1','122500','F024/26','Implantcast','ASTM F1875 Fretting Corrosion',5000,'RPA','2026-08-17','2026-08-21',5,'S1','currently_running','high','2026-09-01'),
 (2,'HR2','122501','F025/26','Amplitude','ASTM F2068 Femoral Stem Fatigue',4500,'JFM','2026-08-24','2026-08-28',5,'S1','can_be_started','normal','2026-09-15'),
 (3,'HR3','122502','F026/26','Medacta','ASTM F3090 Dynamic Loading',4000,'SSC','2026-08-19','2026-09-01',10,'S2','currently_running','normal','2026-09-20'),
 (4,'HR4','122503','F027/26','Zimmer Biomet','ISO 7206-6 Neck Fatigue',6200,'MKL','2026-09-01','2026-09-11',9,'S3','in_preparation','high','2026-09-30'),
 (5,'HR5','122504','F028/26','Smith & Nephew','ASTM F1717 Spinal Construct',7100,'TBR','2026-08-25','2026-09-04',9,'D1','can_be_started','urgent','2026-09-10'),
 (6,'HR6','122505','F029/26','Aesculap','ISO 14242-1 Hip Wear',15000,'RPA','2026-09-07','2026-10-02',20,'MTS','in_preparation','high','2026-10-15'),
 (7,'HR7','122506','F030/26','Stryker','ASTM F543 Screw Torsion',3200,'JFM','2026-08-31','2026-09-03',4,'INS','can_be_started','normal','2026-09-18'),
 (8,'HR8','122507','F031/26','Corin','ASTM F2996 Stem FEA Validation',5400,'SSC','2026-09-14','2026-09-18',5,'S4','in_preparation','normal','2026-10-01'),
 (9,'HR9','122508','F032/26','Medacta','ASTM F1820 Knee Constraint',4800,'MKL','2026-08-10','2026-08-14',5,'S5','finished','normal','2026-08-20'),
 (10,'HR10','122509','F033/26','Implantcast','Maintenance / Calibration',0,'TBR','2026-09-21','2026-09-23',3,'D2','maintenance','normal',NULL),
 (11,'HR11','122510','F034/26','Amplitude','ISO 7206-4 Endurance',6600,'RPA','2026-08-12','2026-08-17',4,'D3','currently_running','normal','2026-08-28')
) AS v(nr,opp,quote,pcode,cust,title,price,resp,sd,ed,days,mach,status,prio,deadline)
JOIN public.customers c ON c.name=v.cust
JOIN public.employees e ON e.initials=v.resp
JOIN public.machines m ON m.code=v.mach;

INSERT INTO public.projects (nr,opportunity_code,quote,project_code,customer_id,title,price,responsible_id,planned_days,preferred_machine_id,status,priority,deadline)
SELECT v.nr,v.opp,v.quote,v.pcode,c.id,v.title,v.price,e.id,v.days,m.id,v.status,v.prio,v.deadline::date
FROM (VALUES
 (12,'HR12','122511','F035/26','Stryker','ASTM F1875 Taper Corrosion',5200,'JFM',5,'S1','ordered','high','2026-09-25'),
 (13,'HR13','122512','F036/26','Corin','ISO 7206-10 Static Compression',3900,'SSC',3,'S2','can_be_started','normal','2026-10-05'),
 (14,'HR14','122513','F037/26','Aesculap','ASTM F1717 Vertebrectomy',7400,'MKL',8,'D1','quotation_sent','low','2026-11-01'),
 (15,'HR15','122514','F038/26','Zimmer Biomet','ASTM F2077 Intervertebral Device',8800,'TBR',10,'D4','ordered','urgent','2026-09-28'),
 (16,'HR16','122515','F039/26','Smith & Nephew','ASTM F543 Pull-out Strength',2900,'RPA',2,'INS','in_preparation','normal','2026-10-12')
) AS v(nr,opp,quote,pcode,cust,title,price,resp,days,mach,status,prio,deadline)
JOIN public.customers c ON c.name=v.cust
JOIN public.employees e ON e.initials=v.resp
JOIN public.machines m ON m.code=v.mach;
