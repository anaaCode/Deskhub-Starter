import { get, post, patch, del } from "./client.js";

export const listTickets  = (params = "") => get(`/tickets${params}`);
export const getTicket    = (id)          => get(`/tickets/${id}`);
export const createTicket = (data)        => post("/tickets", data);
export const updateTicket = (id, data)    => patch(`/tickets/${id}`, data);
export const deleteTicket = (id)          => del(`/tickets/${id}`);
export const listComments = (ticketId)    => get(`/comments?ticketId=${ticketId}&_sort=createdAt&_order=asc`);
export const addComment   = (data)        => post("/comments", data);
export const listUsers    = ()            => get("/users");