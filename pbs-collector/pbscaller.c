#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pbs_error.h>
#include <pbs_ifl.h>
#include <unistd.h>
#include <signal.h>

extern char *pbs_server;

int process_data(struct batch_status *bs,char* type);

int process_data_json(struct batch_status *bs,char* type, const char* output_dir);

int main(int argc, char **argv) {
    /*PBS variables*/
    int con;
    struct batch_status *bs_server, *bs_queue, *bs_node, *bs_job, *bs_resv, *bs_rsc, *bs_sched;
    /* my variables */
    char* server;
    const char* output_dir;

    if(argc != 3) {
        fprintf(stderr,"Usage: %s servername output_directory\n",argv[0]);
        return 1;
    }
    server = argv[1];
    output_dir = argv[2];
    
    con = pbs_connect(server);    
    if(con<0) {
        fprintf(stderr,"Cannot connect to %s, error %d \n",server,pbs_errno);
        return 1;
    }
    printf("Connected to %s\n", server);
    printf("Getting server info\n");
    /* get server info */
    bs_server = pbs_statserver(con, NULL, NULL);
    printf("Getting queues info\n");
    /* get queues info */
    bs_queue = pbs_statque(con, "", NULL, NULL);
    printf("Getting nodes info\n");
    /* get nodes info */
    bs_node = pbs_statnode(con, "", NULL, NULL);
    printf("Getting jobs info\n");
    /* get jobs info: t - job arrays, x - finished jobs*/
    bs_job = pbs_statjob(con, "", NULL, "tx");
    printf("Getting reservations info\n");
    /* get reservations info */
    bs_resv = pbs_statresv(con, NULL, NULL, NULL);
    printf("Getting resources info\n");
    /* get resources info */
    bs_rsc = pbs_statrsc(con, NULL, NULL, NULL);
    printf("Getting scheduler info\n");
    /* get scheduler info */
    bs_sched = pbs_statsched(con, NULL, NULL);
    /* get hook info */
    // printf("Getting hook info\n");
    // bs = pbs_stathook(con, NULL, NULL, NULL);
    // process_data_json(bs,"hooks");
    /* end connection */
    pbs_disconnect(con);

    process_data_json(bs_server,"servers", output_dir);
    process_data_json(bs_queue,"queues", output_dir);
    process_data_json(bs_node,"nodes", output_dir);
    process_data_json(bs_job,"jobs", output_dir);
    process_data_json(bs_resv,"reservations", output_dir);
    process_data_json(bs_rsc,"resources", output_dir);
    process_data_json(bs_sched,"schedulers", output_dir);
    return 0;
}

int process_data(struct batch_status *bs,char* type) {
    struct batch_status *tmp;
    struct attrl *atp;
    int i;
    int pocet=0;
    char filename[256];
    snprintf(filename, sizeof(filename), "%s.txt", type);
    FILE *fp = fopen(filename, "w");
    if (!fp) {
        fprintf(stderr, "Failed to open file %s for writing\n", filename);
        return -1;
    }
    /* count results */
    for(tmp=bs;tmp!=NULL;tmp=tmp->next) { pocet++; }

    fprintf(fp, "%s - pocet: %d\n",type,pocet);
    for(tmp=bs,i=0;tmp!=NULL;tmp=tmp->next,i++) {
        fprintf(fp, "--------   %s\n",tmp->name);

        for(atp=tmp->attribs;atp!=NULL;atp=atp->next) {
            if(atp->resource!=NULL) {
                fprintf(fp, "%s.%s=%s\n",atp->name,atp->resource,atp->value);
            } else {
                fprintf(fp, "%s=%s\n",atp->name,atp->value);
            }
        }
    }

    fprintf(fp, "\n\n\n-------------------\n\n\n");
    fclose(fp);

    /* free allocated memory */
    pbs_statfree(bs);
    return 0;
}

static void json_escape(const char *src, FILE *fp) {
    for (const char *p = src; *p; p++) {
        switch (*p) {
            case '\"': fputs("\\\"", fp); break;
            case '\\': fputs("\\\\", fp); break;
            case '\n': fputs("\\n", fp); break;
            case '\r': fputs("\\r", fp); break;
            case '\t': fputs("\\t", fp); break;
            default: fputc(*p, fp); break;
        }
    }
}

/* Main function */
int process_data_json(struct batch_status *bs, char *type, const char* output_dir) {
    struct batch_status *tmp;
    struct attrl *atp;
    int count = 0;
    char filename[512];
    char temp_filename[512];
    char *buffer = NULL;
    FILE *fp = NULL;

    snprintf(filename, sizeof(filename), "%s/%s.json", output_dir, type);
    snprintf(temp_filename, sizeof(temp_filename), "%s/%s.json.tmp", output_dir, type);
    
    /* Write to temporary file first for atomic updates */
    fp = fopen(temp_filename, "w");
    if (!fp) {
        fprintf(stderr, "Failed to open temporary file %s for writing\n", temp_filename);
        return -1;
    }
    
    /* Set large buffer (256KB) for better performance with very large JSON files */
    /* This significantly reduces system calls when writing large files like jobs.json */
    buffer = (char *)malloc(262144); /* 256KB buffer */
    if (buffer) {
        setvbuf(fp, buffer, _IOFBF, 262144);
    }

    /* Count items */
    for (tmp = bs; tmp != NULL; tmp = tmp->next)
        count++;

    /* Start JSON */
    fprintf(fp, "{\n");
    fprintf(fp, "  \"type\": \"%s\",\n", type);
    fprintf(fp, "  \"count\": %d,\n", count);
    fprintf(fp, "  \"items\": [\n");

    int i = 0;
    for (tmp = bs; tmp != NULL; tmp = tmp->next, i++) {
        fprintf(fp, "    {\n");
        fprintf(fp, "      \"name\": \"");
        json_escape(tmp->name, fp);
        fprintf(fp, "\",\n");
        fprintf(fp, "      \"attributes\": {\n");

        int j = 0;
        for (atp = tmp->attribs; atp != NULL; atp = atp->next, j++) {
            fprintf(fp, "        \"");
            json_escape(atp->name, fp);
            if (atp->resource != NULL) {
                fputc('.', fp);
                json_escape(atp->resource, fp);
            }
            fprintf(fp, "\": \"");
            json_escape(atp->value, fp);
            fprintf(fp, "\"");
            if (atp->next != NULL)
                fprintf(fp, ",");
            fputc('\n', fp);
        }

        fprintf(fp, "      }\n");
        fprintf(fp, "    }");
        if (tmp->next != NULL)
            fprintf(fp, ",");
        fputc('\n', fp);
        
        /* For very large files (like jobs), flush periodically to ensure progress */
        /* Flush every 1000 items to prevent buffer from getting too large */
        if (i > 0 && i % 1000 == 0 && strcmp(type, "jobs") == 0) {
            fflush(fp);
        }
    }

    fprintf(fp, "  ]\n");
    fprintf(fp, "}\n");

    /* Flush all buffered data to disk before closing */
    fflush(fp);
    fclose(fp);
    fp = NULL;
    
    /* Free buffer */
    if (buffer) {
        free(buffer);
        buffer = NULL;
    }
    
    /* Atomically rename temp file to final filename */
    if (rename(temp_filename, filename) != 0) {
        fprintf(stderr, "Failed to rename %s to %s\n", temp_filename, filename);
        unlink(temp_filename); /* Clean up temp file on error */
        pbs_statfree(bs);
        return -1;
    }
    
    pbs_statfree(bs);
    return 0;
}
