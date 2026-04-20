UPDATE public.configuracoes_lembretes SET mensagem = '🌸 Olá, {nome}! Seu agendamento no *Estúdio Dyoli Godim* foi confirmado com todo carinho 💖

📅 Data: {data}
🕒 Horário: {horario}
✨ Serviço: {servico}

Mal posso esperar para te receber! Qualquer dúvida, é só me chamar por aqui. Até breve! 🤍

— Dyoli Godim' WHERE tipo = 'confirmacao';

UPDATE public.configuracoes_lembretes SET mensagem = '🌷 Oi, {nome}! Passando para te lembrar do seu momento especial no *Estúdio Dyoli Godim* 💕

📅 {data} às {horario}
✨ {servico}

Recomendo chegar com 5 minutinhos de antecedência para relaxar antes do atendimento. Se precisar remarcar, me avise por aqui com carinho. Te espero! 🤍

— Dyoli Godim' WHERE tipo = 'lembrete';

UPDATE public.configuracoes_lembretes SET mensagem = '🤍 Olá, {nome}. Seu agendamento no *Estúdio Dyoli Godim* para {data} às {horario} foi cancelado.

Sentirei sua falta! Quando quiser remarcar, é só me chamar por aqui que reservo um novo horário especial para você. 🌸

— Dyoli Godim' WHERE tipo = 'cancelamento';

UPDATE public.configuracoes_lembretes SET mensagem = '💖 {nome}, foi um prazer te receber hoje no *Estúdio Dyoli Godim*!

Obrigada pela confiança e pelo carinho de sempre. Cuide bem do resultado e qualquer dúvida sobre os cuidados, estou por aqui. ✨

Até a próxima! 🌷

— Dyoli Godim' WHERE tipo = 'comparecimento';

UPDATE public.configuracoes_lembretes SET mensagem = '⭐ Oi, {nome}! Aqui é a Dyoli 🤍

Espero que esteja amando o resultado do seu atendimento no *Estúdio Dyoli Godim*! Sua opinião significa muito para mim e ajuda outras clientes a conhecerem nosso trabalho.

Se puder, me conta como foi sua experiência? 💕🌸

— Dyoli Godim' WHERE tipo = 'pos_atendimento';