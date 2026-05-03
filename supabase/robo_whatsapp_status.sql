alter table pedidos
add column if not exists whatsapp_status_enviado boolean default false;

alter table pedidos
add column if not exists whatsapp_status_enviado_em timestamp with time zone;

alter table pedidos
add column if not exists whatsapp_status_erro text;

create or replace function reset_whatsapp_status_enviado()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    new.whatsapp_status_enviado := false;
    new.whatsapp_status_enviado_em := null;
    new.whatsapp_status_erro := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reset_whatsapp_status_enviado on pedidos;

create trigger trg_reset_whatsapp_status_enviado
before update on pedidos
for each row
execute function reset_whatsapp_status_enviado();
