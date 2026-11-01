-- Pinoy Hoops Live Vertical (product 'hoops_vert', codes PHV-...): the 9:16 portrait streaming app for Reels /
-- TikTok / Shorts sharing. Single camera, so its codes cover 1 phone by default like the other single-camera apps.

alter table stream_license drop constraint if exists stream_license_product_check;
alter table stream_license
  add constraint stream_license_product_check check (product in ('hoops', 'pickle', 'hoops_adv', 'hoops_vert'));
